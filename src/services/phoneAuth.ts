import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { serverTimestamp, collection, doc, root } from "./db";
import {log,warn,error,info} from "../utils/logger"
import { authBootstrap } from "./authState";
import crashlytics from "@react-native-firebase/crashlytics";
/* ================= STATE ================= */

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;
let lastOtpRequestTime: number | null = null;
let confirmAttempts = 0;

/* ================= NORMALIZE PHONE ================= */

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("961")) {
    return "+" + digits;
  }

  return "+961" + digits;
}

/* ================= SEND OTP ================= */

export async function sendOtp(phone: string) {
  try {
    const normalizedPhone = normalizePhone(phone);
    const now = Date.now();

    // ✅ 1. Client cooldown (60 seconds)
    if (lastOtpRequestTime && now - lastOtpRequestTime < 60000) {
      throw new Error("Please wait before requesting another code.");
    }

    // ✅ 2. Firestore rate limiting (5 per 10 minutes)
    const attemptRef = collection("otp_attempts").doc(normalizedPhone);
    const attemptSnap = await attemptRef.get();

    if (attemptSnap.exists()) {
      const data = attemptSnap.data();
      const lastRequest = data?.lastRequest ?? 0;
      const requestCount = data?.count ?? 0;

      const tenMinutes = 10 * 60 * 1000;

      if (requestCount >= 5 && now - lastRequest < tenMinutes) {
        throw new Error("Too many OTP requests. Try again later.");
      }

      await attemptRef.set(
        {
          count: now - lastRequest > tenMinutes ? 1 : requestCount + 1,
          lastRequest: now,
        },
        { merge: true }
      );
    } else {
      await attemptRef.set({
        count: 1,
        lastRequest: now,
      });
    }

    lastOtpRequestTime = now;

    log("📲 Sending OTP to:", normalizedPhone);

    confirmationResult = await auth().signInWithPhoneNumber(normalizedPhone);

    if (!confirmationResult) {
      throw new Error("Failed to start OTP session.");
    }

    log("✅ OTP sent successfully");
 } catch (err: any) {
  error("🔥 sendOtp error:", err?.message);

  crashlytics().log("sendOtp failed");
  crashlytics().setAttribute("otp_phone", phone?.slice(-4) ?? "unknown");
  crashlytics().setAttribute("otp_error_code", err?.code ?? "none");
  crashlytics().recordError(err);

  throw new Error(err?.message || "Unable to send OTP. Please try again.");
}
}

/* ================= CONFIRM OTP ================= */

export const confirmOtp = async (code: string) => {
  if (authBootstrap.isBootstrapping) return;

  authBootstrap.isBootstrapping = true;
  try {
    log("🔐 Starting OTP confirmation...");

    if (!confirmationResult) {
      throw new Error("OTP session expired. Please request a new code.");
    }

    // ✅ Limit brute-force attempts
    if (confirmAttempts >= 5) {
      throw new Error("Too many incorrect attempts. Request a new code.");
    }

    confirmAttempts++;
if (!code || code.length !== 6) {
  throw new Error("Invalid verification code.");
}

    const result = await confirmationResult.confirm(code);

    if (!result) {
      throw new Error("OTP verification failed.");
    }
await result.user.getIdToken(true);

//authBootstrap.isBootstrapping = false;
    log("✅ OTP confirmed");

    // Reset attempts on success
    confirmAttempts = 0;
    confirmationResult = null;

    const user = result.user;

    if (!user.phoneNumber) {
      throw new Error("Phone number missing from auth result.");
    }

    const phone = normalizePhone(user.phoneNumber);
    const uid = user.uid;

    log("📱 Normalized phone:", phone);
    log("👤 Auth UID:", uid);
crashlytics().log("OTP confirmed successfully");
crashlytics().setUserId(uid);
    /* ================= CHECK INVITE ================= */

    log("🔎 Checking trainer_invites...");
    const inviteRef = doc("trainer_invites", phone);
    const inviteSnap = await inviteRef.get();

    if (inviteSnap.exists()) {
      log("🎟 Invite found. Creating trainer...");

      const inviteData = inviteSnap.data();

      await collection("users").doc(uid).set({
        role: "trainer",
        firstName: inviteData?.firstName ?? "",
        lastName: inviteData?.lastName ?? "",
        phone,
        profilePicture: "",
        bio: "",
        notificationsEnabled: true,
        authUid: uid,
        isActive: true,
        isAdmin: inviteData?.isAdmin ?? false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
log("Auth token phone:", auth().currentUser?.phoneNumber);
log("Invite doc id:", phone);
      await collection("trainer_schedules").doc(uid).set({
        trainerId: uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await inviteRef.delete();

      log("✅ Trainer created successfully");

      return { role: "trainer" as const };
    }

    /* ================= CHECK EXISTING TRAINER ================= */

const trainerSnap = await doc("users", uid).get();

if (trainerSnap.exists()) {
  log("👤 Existing trainer found");

  return {
    role: "trainer" as const,
    id: trainerSnap.id,   // ✅ Correct
  };
}
    /* ================= CHECK CLIENT ================= */
const clientSnap = await root()
  .collection("clients")
  .where("phone", "==", phone)
  .limit(1)
  .get();

    if (clientSnap.empty) {
      await auth().signOut();  
      throw new Error(
        "Account not found. Please contact your trainer or administrator."
      );
    }

    const clientDoc = clientSnap.docs[0];
    const clientData = clientDoc.data();

    if (!clientData.authUid) {
      await clientDoc.ref.update({
        authUid: uid,
        phoneVerified: true,
      });
    }

    log("✅ Client authenticated");

    return {
      role: "client" as const,
      id: clientDoc.id,
    };

} catch (err: any) {
  error("🔥 CONFIRM OTP ERROR:");
  error("Message:", err?.message);
  error("Code:", err?.code);

  crashlytics().log("confirmOtp failed");
  crashlytics().setAttribute("otp_error_code", err?.code ?? "none");
  crashlytics().setAttribute("otp_error_message", err?.message ?? "none");

  const currentUser = auth().currentUser;

  if (currentUser) {
    crashlytics().setAttribute("auth_user_exists", "true");
    crashlytics().setUserId(currentUser.uid);
  } else {
    crashlytics().setAttribute("auth_user_exists", "false");
  }

  // 🔥 If user already authenticated, resolve role
  if (currentUser && currentUser.phoneNumber) {
    crashlytics().log("OTP threw error but user already signed in. Using fallback role resolution.");

    confirmAttempts = 0;
    confirmationResult = null;

    const phone = normalizePhone(currentUser.phoneNumber);
    const uid = currentUser.uid;

    try {
      const trainerSnap = await doc("users", uid).get();
      if (trainerSnap.exists()) {
        crashlytics().log("Fallback resolved as trainer");
        return { role: "trainer" as const, id: trainerSnap.id };
      }

      const clientSnap = await root()
        .collection("clients")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (!clientSnap.empty) {
        crashlytics().log("Fallback resolved as client");
        return { role: "client" as const, id: clientSnap.docs[0].id };
      }

      crashlytics().log("Fallback failed to resolve role");
    } catch (fallbackErr: any) {
      crashlytics().recordError(fallbackErr);
    }
  }

  confirmationResult = null;

  crashlytics().recordError(err);

  throw err;
}finally {
    authBootstrap.isBootstrapping = false;  // ✅ ALWAYS RESET HERE
  }
};