import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

import { doc, getDoc, setDoc } from "../services/fireStoreHelpers";

// User roles
export type UserRole = "client" | "trainer";

/* -------------------------------------------------------------------------- */
/*                               REGISTER USER                                 */
/* -------------------------------------------------------------------------- */

export async function registerUser(
  email: string,
  password: string,
  role: UserRole,
  name: string
) {
  console.info("[AuthService] registerUser → start", {
    email,
    role,
  });

  try {
    // 1️⃣ Create user in Firebase Auth
    const credential = await auth().createUserWithEmailAndPassword(
      email,
      password
    );

    const uid = credential.user.uid;

    console.info("[AuthService] Auth user created", {
      uid,
      email,
    });

    // 2️⃣ Save user profile in Firestore
    await setDoc(doc("users", uid), {
      uid,
      email,
      role,
      name,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    console.info("[AuthService] Firestore user document created", {
      uid,
      role,
    });

    return { uid, email, role, name };
  } catch (error: any) {
    console.error("[AuthService] registerUser → failed", {
      email,
      role,
      message: error?.message,
      code: error?.code,
    });

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                               LOGIN TRAINER                                 */
/* -------------------------------------------------------------------------- */

export async function loginTrainer(email: string, password: string) {
  console.info("[AuthService] loginTrainer → start", { email });

  try {
    // 1️⃣ Firebase Auth login
    const credential = await auth().signInWithEmailAndPassword(
      email,
      password
    );

    const uid = credential.user.uid;

    console.info("[AuthService] Auth login success", { uid });

    // 2️⃣ Load Firestore user profile
    const snap = await getDoc(doc("users", uid));

    if (!snap.exists) {
      console.warn("[AuthService] User document missing", { uid });
      throw new Error("Access denied");
    }

    const user = snap.data();

    // 3️⃣ Role validation
    if (user.role !== "trainer") {
      console.warn("[AuthService] Role mismatch", {
        uid,
        role: user.role,
      });
      throw new Error("Not authorized");
    }

    console.info("[AuthService] Trainer login success", {
      uid,
      role: user.role,
    });

    return user;
  } catch (error: any) {
    console.error("[AuthService] loginTrainer → failed", {
      email,
      message: error?.message,
      code: error?.code,
    });

    throw error;
  }
}