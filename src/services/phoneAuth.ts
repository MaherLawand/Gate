import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { serverTimestamp, collection, doc } from "./fireStoreHelpers";

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

/* ================= SEND OTP ================= */

export async function sendOtp(phone: string) {
  try {
    console.log("Sending OTP to:", phone);

    confirmationResult = await auth().signInWithPhoneNumber(phone);

    if (!confirmationResult) {
      throw new Error("Failed to start OTP session");
    }

    console.log("OTP sent successfully");
  } catch (err: any) {
    console.error("sendOtp error:", err);
    throw new Error(err?.message || "Unable to send OTP. Please try again.");
  }
}

/* ================= NORMALIZE PHONE ================= */

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").startsWith("961")
    ? "+" + phone.replace(/\D/g, "")
    : "+961" + phone.replace(/\D/g, "");
}

/* ================= CONFIRM OTP ================= */

export const confirmOtp = async (code: string) => {
  try {
    console.log("🔐 Starting OTP confirmation...");

    if (!confirmationResult) {
      throw new Error("OTP session expired. Please request a new code.");
    }

    const result = await confirmationResult.confirm(code);
    if (!result) {
  throw new Error("OTP verification failed.");
}

console.log("✅ OTP confirmed");

    const user = result.user;
    if (!user.phoneNumber)
      throw new Error("Phone number missing from auth result");

    const phone = normalizePhone(user.phoneNumber);
    const uid = user.uid;

    console.log("📱 Normalized phone:", phone);
    console.log("👤 Auth UID:", uid);

    /* ================= CHECK INVITE ================= */

    console.log("🔎 Checking trainer_invites...");
    const inviteRef = doc("trainer_invites", phone);

    const inviteSnap = await inviteRef.get();
    console.log("📦 Invite exists:", inviteSnap.exists());

    if (inviteSnap.exists()) {
      console.log("🎟 Invite found. Creating trainer...");

      const inviteData = inviteSnap.data();
      console.log("Invite data:", inviteData);

      console.log("📝 Creating user document...");
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      console.log("✅ User document created");

      console.log("📅 Creating trainer_schedules root...");
      await collection("trainer_schedules").doc(uid).set({
        trainerId: uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ Trainer schedule created");

      console.log("🗑 Deleting invite...");
      await inviteRef.delete();
      console.log("✅ Invite deleted");

      return { role: "trainer" as const };
    }

    /* ================= CHECK TRAINER ================= */

    console.log("🔎 Checking existing trainer...");
    const trainerSnap = await collection("users")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    console.log("Trainer query size:", trainerSnap.size);

    if (!trainerSnap.empty) {
      console.log("👤 Existing trainer found");
      return {
        role: "trainer" as const,
        id: trainerSnap.docs[0].id,
      };
    }

    /* ================= CHECK CLIENT ================= */

    console.log("🔎 Checking client...");
    const clientSnap = await collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    console.log("Client query size:", clientSnap.size);

    if (clientSnap.empty) {
      console.log("❌ No client found. Signing out...");
      await auth().signOut();
      throw new Error(
        "Account not found. Please contact your trainer or administrator."
      );
    }

    const clientDoc = clientSnap.docs[0];
    const clientData = clientDoc.data();

    console.log("👤 Client found:", clientDoc.id);

    if (!clientData.authUid) {
      console.log("🔗 Linking client to auth UID...");
      await clientDoc.ref.update({
        authUid: uid,
        phoneVerified: true,
      });
      console.log("✅ Client linked");
    }

    return {
      role: "client" as const,
      id: clientDoc.id,
    };

  } catch (err: any) {
    console.error("🔥 CONFIRM OTP ERROR:");
    console.error("Message:", err?.message);
    console.error("Code:", err?.code);
    console.error("Full error:", err);
    throw err;
  }
};