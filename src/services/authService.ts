import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { log, error,info,warn } from "@/src/utils/logger";

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
  info("[AuthService] registerUser → start", {
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

    info("[AuthService] Auth user created", {
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

    info("[AuthService] Firestore user document created", {
      uid,
      role,
    });

    return { uid, email, role, name };
  } catch (error: any) {
    error("[AuthService] registerUser → failed", {
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
  info("[AuthService] loginTrainer → start", { email });

  try {
    // 1️⃣ Firebase Auth login
    const credential = await auth().signInWithEmailAndPassword(
      email,
      password
    );

    const uid = credential.user.uid;

    info("[AuthService] Auth login success", { uid });

    // 2️⃣ Load Firestore user profile
    const snap = await getDoc(doc("users", uid));

    if (!snap.exists()) {
      warn("[AuthService] User document missing", { uid });
      throw new Error("Access denied");
    }

    const user = snap.data();

    // 3️⃣ Role validation
    if (user.role !== "trainer") {
      warn("[AuthService] Role mismatch", {
        uid,
        role: user.role,
      });
      throw new Error("Not authorized");
    }

    info("[AuthService] Trainer login success", {
      uid,
      role: user.role,
    });

    return user;
  } catch (error: any) {
    error("[AuthService] loginTrainer → failed", {
      email,
      message: error?.message,
      code: error?.code,
    });

    throw error;
  }
}