import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { serverTimestamp } from "./fireStoreHelpers";

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

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
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").startsWith("961")
    ? "+" + phone.replace(/\D/g, "")
    : "+961" + phone.replace(/\D/g, "");
}
export const confirmOtp = async (code: string) => {
  if (!confirmationResult) {
    throw new Error("OTP session expired. Please request a new code.");
  }

  // 🔐 1️⃣ Verify OTP
  const result = await confirmationResult.confirm(code);
  if (!result) {
    throw new Error("OTP verification failed.");
  }

  const user = result.user;
  if (!user.phoneNumber) {
    throw new Error("Phone number missing from auth result");
  }

  const phone = normalizePhone(user.phoneNumber);
  console.log("Invite snapshot fetched for phone:", phone);

  const inviteSnap = await firestore()
    .collection("trainer_invites")
    .doc(phone)
    .get();
  console.log("Invite snapshot data:", inviteSnap);

  if (inviteSnap.exists()) {
    const inviteData = inviteSnap.data();
    await firestore()
      .collection("users")
      .doc(user.uid)
      .set({
        role: "trainer",

        // Identity
        firstName: inviteData?.firstName ?? "",
        lastName: inviteData?.lastName ?? "",
        phone,
        profilePicture: "",
        bio: "",

        // Account settings
        notificationsEnabled: true,

        // System
        authUid: user.uid,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

    await firestore().collection("trainer_schedules").doc(user.uid).set({
      trainerId: user.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    console.log("New trainer created with UID:", user.uid);
    console.log("Invite data:", inviteSnap.data());
    await inviteSnap.ref.delete();

    return { role: "trainer" };
  }

  const uid = user.uid;
  console.log("Authenticated UID:", uid);
  console.log("Authenticated Phone:", phone);

  // ======================
  // 🔍 2️⃣ CHECK TRAINER
  // ======================
  const trainerSnap = await firestore()
    .collection("users")
    .where("phone", "==", phone)
    .limit(1)
    .get();

  if (!trainerSnap.empty) {
    return {
      role: "trainer" as const,
      id: trainerSnap.docs[0].id,
    };
  }

  // ======================
  // 🔍 3️⃣ CHECK CLIENT
  // ======================
  const clientSnap = await firestore()
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

  // 🔗 Link auth UID once
  if (!clientData.authUid) {
    await clientDoc.ref.update({
      authUid: uid,
      phoneVerified: true,
    });
  }

  return {
    role: "client" as const,
    id: clientDoc.id,
  };
};
