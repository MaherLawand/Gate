import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import crashlytics from "@react-native-firebase/crashlytics";
import firestore from "@react-native-firebase/firestore";
import { error, log } from "../utils/logger";
import { authBootstrap } from "./authState";
import { collection, doc, root, serverTimestamp } from "./db";
/* ================= STATE ================= */

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;
let lastOtpRequestTime: number | null = null;
let confirmAttempts = 0;
let lastPhoneUsed: string | null = null;
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
    lastPhoneUsed = normalizedPhone;
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
        { merge: true },
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
    // 🔥 TEST ACCOUNT BYPASS (App Store review)
    const TEST_PHONE = "+96112345679";
    const TEST_CODE = "123456";

    if (lastPhoneUsed === TEST_PHONE && code === TEST_CODE) {
      console.log("🧪 TEST MODE START");

      try {
        // 🔥 STEP 1: Fetch token
        console.log("➡️ Fetching custom token...");

        const res = await fetch(
          "https://us-central1-gate-2056a.cloudfunctions.net/getTestToken",
        );

        console.log("🌐 Fetch response status:", res.status);

        if (!res.ok) {
          console.log("❌ Fetch failed");
          throw new Error("Failed to fetch custom token");
        }

        const data = await res.json();
        console.log("📦 Token response:", data);

        if (!data?.token) {
          console.log("❌ No token in response");
          throw new Error("Invalid token response");
        }

        // 🔥 STEP 2: Firebase login
        console.log("➡️ Signing in with custom token...");

        const userCredential = await auth().signInWithCustomToken(data.token);

        console.log("✅ Sign in success");

        // 🔥 FORCE SYNC
        await userCredential.user.getIdToken(true);
        console.log("🔄 Token refreshed");

        console.log("👤 AUTH USER:", auth().currentUser);
        console.log("🆔 AUTH UID:", auth().currentUser?.uid);

        const token = await auth().currentUser?.getIdToken();
        console.log("🔑 TOKEN EXISTS:", !!token);

        const user = userCredential.user;

        if (!user?.uid) {
          console.log("❌ No UID after login");
          throw new Error("Auth failed");
        }

        const uid = user.uid;

        console.log("✅ Authenticated UID:", uid);

        // 🔥 STEP 3: Firestore read
        console.log("➡️ Fetching client doc...");

        const clientDocRef = root()
          .collection("clients")
          .doc("DBKJ4ncJ3P05qko6GSnY");

        console.log("📄 Doc path:", clientDocRef.path);

        const clientDoc = await clientDocRef.get();

        console.log("📄 Doc exists:", clientDoc.exists);

        if (clientDoc.exists()) {
          console.log("📄 Doc data:", clientDoc.data());
        } else {
          console.log("❌ Doc does not exist");
        }

        if (!clientDoc.exists) {
          throw new Error("Test client not found");
        }

        console.log("✅ TEST MODE SUCCESS");

        return {
          role: "client" as const,
          id: clientDoc.id,
        };
      } catch (err: any) {
        console.log("🔥 TEST MODE ERROR:");
        console.log("Message:", err?.message);
        console.log("Code:", err?.code);
        console.log("Full error:", err);

        throw err;
      }
    }
    if (!confirmationResult) {
      throw new Error("OTP session expired. Please request a new code.");
    }

    if (confirmAttempts >= 5) {
      throw new Error("Too many incorrect attempts. Request a new code.");
    }

    if (!code || code.length !== 6) {
      throw new Error("Invalid verification code.");
    }

    confirmAttempts++;

    // We need the phone used in sendOtp → store it globally
    // If you don’t have it yet, I’ll show you below

    const result = await confirmationResult.confirm(code);

    if (!result?.user) {
      throw new Error("OTP verification failed.");
    }

    await result.user.getIdToken(true);

    log("✅ OTP confirmed");

    // reset session
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

    /* ================= INVITE → TRAINER ================= */

    const inviteRef = doc("trainer_invites", phone);
    const inviteSnap = await inviteRef.get();

    if (inviteSnap.exists()) {
      log("🎟 Invite found. Creating trainer...");

      const inviteData = inviteSnap.data();

      await collection("users")
        .doc(uid)
        .set({
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

      await collection("trainer_schedules").doc(uid).set({
        trainerId: uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await inviteRef.delete();

      log("✅ Trainer created");

      return { role: "trainer" as const };
    }

    /* ================= EXISTING TRAINER ================= */

    const trainerSnap = await doc("users", uid).get();

    if (trainerSnap.exists()) {
      log("👤 Existing trainer");

      return {
        role: "trainer" as const,
        id: trainerSnap.id,
      };
    }

    /* ================= CLIENT ================= */

    const clientSnap = await root()
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (clientSnap.empty) {
      log("❌ No client found → signing out");

      await auth().signOut();

      // important cleanup
      confirmationResult = null;
      confirmAttempts = 0;

      throw new Error(
        "Account not found. Please contact your trainer or administrator.",
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
  error("🔥 CONFIRM OTP ERROR:", err?.message);

  crashlytics().log("confirmOtp failed");
  crashlytics().setAttribute("otp_error_code", err?.code ?? "none");
  crashlytics().setAttribute("otp_error_message", err?.message ?? "none");

  const currentUser = auth().currentUser;

  // 🔥 SAFE FALLBACK: user might already be authenticated
  if (
    currentUser?.phoneNumber &&
    err?.message !== "Account not found. Please contact your trainer or administrator."
  ) {
    log("⚠️ confirm failed but user exists → recovering");

    crashlytics().log("Fallback triggered: user already authenticated");
    crashlytics().setUserId(currentUser.uid);

    const phone = normalizePhone(currentUser.phoneNumber);
    const uid = currentUser.uid;

    try {
      /* ================= INVITE → TRAINER ================= */

      const inviteRef = doc("trainer_invites", phone);
      const inviteSnap = await inviteRef.get();

      if (inviteSnap.exists()) {
        const inviteData = inviteSnap.data();

        await collection("users")
          .doc(uid)
          .set({
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

        await collection("trainer_schedules").doc(uid).set({
          trainerId: uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        await inviteRef.delete();

        confirmAttempts = 0;
        confirmationResult = null;

        return { role: "trainer" as const };
      }

      /* ================= EXISTING TRAINER ================= */

      const trainerSnap = await doc("users", uid).get();

      if (trainerSnap.exists()) {
        confirmAttempts = 0;
        confirmationResult = null;

        return {
          role: "trainer" as const,
          id: trainerSnap.id,
        };
      }

      /* ================= CLIENT ================= */

      const clientSnap = await root()
        .collection("clients")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (!clientSnap.empty) {
        const clientDoc = clientSnap.docs[0];
        const clientData = clientDoc.data();

        // ✅ IMPORTANT FIX: ensure authUid is set
        if (!clientData.authUid) {
          await clientDoc.ref.update({
            authUid: uid,
            phoneVerified: true,
          });
        }

        confirmAttempts = 0;
        confirmationResult = null;

        return {
          role: "client" as const,
          id: clientDoc.id,
        };
      }

      crashlytics().log("Fallback failed to resolve role");
    } catch (fallbackErr: any) {
      crashlytics().recordError(fallbackErr);
    }
  }

  // ❌ No recovery possible → real failure
  confirmationResult = null;

  crashlytics().recordError(err);

  throw err;
} finally {
    authBootstrap.isBootstrapping = false;
  }
};
