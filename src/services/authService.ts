import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

import { doc, getDoc, setDoc } from "../services/fireStoreHelpers";

// User roles
export type UserRole = "client" | "trainer";

// Register user (client or trainer)
export async function registerUser(
  email: string,
  password: string,
  role: UserRole,
  name: string
) {
  // 1️⃣ Create user in Firebase Auth (native)
  const credential = await auth().createUserWithEmailAndPassword(
    email,
    password
  );

  const uid = credential.user.uid;

  // 2️⃣ Save additional info in Firestore
  await setDoc(doc("users", uid), {
    uid,
    email,
    role,
    name,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  return { uid, email, role, name };
}

// Login trainer only
export async function loginTrainer(email: string, password: string) {
  const credential = await auth().signInWithEmailAndPassword(
    email,
    password
  );

  const uid = credential.user.uid;

  const snap = await getDoc(doc("users", uid));

  if (!snap.exists) {
    throw new Error("Access denied");
  }

  const user = snap.data();

  if (user.role !== "trainer") {
    throw new Error("Not authorized");
  }

  return user;
}
