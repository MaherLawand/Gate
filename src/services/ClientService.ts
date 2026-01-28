import { router } from "expo-router";
import { Alert } from "react-native";

import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { auth } from "../services/firebase";

import {
  ClientPackage,
  ClientProfile,
  SessionData,
  SessionExercise,
  SessionWithId,
} from "../types/models";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "../services/fireStoreHelpers";

export const redirectAfterLogin = async (uid: string) => {
  const snap = await getDoc(doc("users", uid));

  if (!snap.exists) {
    console.log("User record not found");
    return;
  }

  const { role } = snap.data();

  if (role === "trainer") {
    router.replace("/trainer/dashboard");
  } else if (role === "client") {
    router.replace("/client/home");
  } else {
    Alert.alert("Error", "Invalid user role");
  }
};

// ADD CLIENT
export async function addClient(
  data: Omit<
    ClientProfile,
    "trainerId" | "trainerName" | "createdAt" | "isActive"
  >
) {
  const user = auth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const newClient: ClientProfile = {
    ...data,
    trainerId: user.uid,
    trainerName: user.email ?? "",
    isActive: true,
    authUid: null,
    phoneVerified: false,
    createdAt: serverTimestamp(),
  };
  console.log("Adding client:", newClient);

  try {
    const ref = await addDoc(collection("clients"), newClient);
    return { ...newClient, id: ref.id };
  } catch (e: any) {
    console.error("Firestore addClient failed:", e);
    throw e;
  }
}

// GET ALL CLIENTS FOR THIS TRAINER
export async function getTrainerClients() {
  const uid = auth().currentUser?.uid;
  if (!uid) return [];

  const snap = await collection("clients")
    .where("trainerId", "==", uid)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as ClientProfile),
  }));
}

export const updateClient = async (
  clientId: string,
  data: Partial<ClientProfile>
) => {
  await setDoc(doc("clients", clientId), data, { merge: true });
};

export const archiveClient = async (clientId: string) => {
  await setDoc(
    doc("clients", clientId),
    { isActive: false, archivedAt: new Date() },
    { merge: true }
  );
};

export const unarchiveClient = async (clientId: string) => {
  await setDoc(
    doc("clients", clientId),
    { isActive: true, archivedAt: null },
    { merge: true }
  );
};

export async function deleteClient(clientId: string) {
  await deleteDoc(doc("clients", clientId));
}

export type ExerciseEntry = {
  id: any;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
};

export const addSession = async (
  clientId: string,
  data: {
    date: string;
    exercises: SessionExercise[];
    packageId: string;
  }
) => {
  await addDoc(collection("clients", clientId, "sessions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

/* ------------------ GET SESSIONS ------------------ */
export const getClientSessions = async (
  clientId: string
): Promise<SessionWithId[]> => {
  const snap = await collection("clients", clientId, "sessions").get();

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as SessionData),
  }));
};

/* ------------------ UPDATE SESSION ------------------ */
export const updateSession = async (
  clientId: string,
  sessionId: string,
  data: SessionData
) => {
  await setDoc(doc("clients", clientId, "sessions", sessionId), data, {
    merge: true,
  });
};

/* ------------------ DELETE SESSION ------------------ */
export const deleteClientSession = async (
  clientId: string,
  sessionId: string
) => {
  await deleteDoc(doc("clients", clientId, "sessions", sessionId));
};

export const addClientPackage = async (
  clientId: string,
  data: {
    price: number;
    totalSessions: number;
    sessionsRemaining: number;
    isPaid: boolean;
  }
) => {
  await addDoc(collection("clients", clientId, "packages"), {
    ...data,
    status: "active",
    createdAt: serverTimestamp(),
    paidAt: data.isPaid ? serverTimestamp() : null,
  });
};

export const renewPackage = async (
  clientId: string,
  data: {
    price: number;
    totalSessions: number;
    isPaid: boolean;
  }
) => {
  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  // Mark old active packages as completed
  for (const pkg of snap.docs) {
    await setDoc(
      pkg.ref,
      {
        status: "completed",
        completedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Create new package
  await addDoc(collection("clients", clientId, "packages"), {
    price: data.price,
    totalSessions: data.totalSessions,
    sessionsRemaining: data.totalSessions,
    isPaid: data.isPaid,
    status: "active",
    createdAt: serverTimestamp(),
    paidAt: data.isPaid ? serverTimestamp() : null,
  });
};

export const getClientPackages = async (
  clientId: string
): Promise<ClientPackage[]> => {
  const snap = await collection("clients", clientId, "packages")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as ClientPackage),
  }));
};

/* ------------------ GET ACTIVE PACKAGE ------------------ */
export const getActivePackage = async (
  clientId: string
): Promise<ClientPackage | null> => {
  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  if (snap.empty) return null;

  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as ClientPackage) };
};
/* ------------------ UPDATE PACKAGE ------------------ */
export const updatePackage = async (
  clientId: string,
  packageId: string,
  data: Partial<ClientPackage>
) => {
  await setDoc(doc("clients", clientId, "packages", packageId), data, {
    merge: true,
  });
};

export const consumePackageSession = async (
  clientId: string,
  packageId: string
) => {
  await setDoc(
    doc("clients", clientId, "packages", packageId),
    {
      sessionsRemaining: firestore.FieldValue.increment(-1),
    },
    { merge: true }
  );
};

export const refreshPackageStatus = async (
  clientId: string,
  pkg: ClientPackage
) => {
  let status: "active" | "completed" | "low" = "active";

  if (pkg.sessionsRemaining <= 0) status = "completed";
  else if (pkg.sessionsRemaining <= 2) status = "low";

  await setDoc(
    doc("clients", clientId, "packages", pkg.id!),
    { status },
    { merge: true }
  );
};

export const completeActivePackage = async (clientId: string) => {
  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  for (const docSnap of snap.docs) {
    await setDoc(docSnap.ref, { status: "completed" }, { merge: true });
  }
};

// ClientService.ts
export const deletePackage = async (clientId: string, packageId: string) => {
  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  if (data.status !== "active") {
    throw new Error("Only active packages can be deleted");
  }

  await deleteDoc(ref);
};

export const decrementPackageSession = async (
  clientId: string,
  packageId: string
) => {
  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data() as ClientPackage;
  console.log("decrementPackageSession - current data:", data);

  if (data.sessionsRemaining <= 0) {
    throw new Error("No sessions remaining to decrement");
  }
  const remaining = data.sessionsRemaining - 1;

  await updatePackage(clientId, packageId, {
    sessionsRemaining: remaining,
    status: remaining <= 0 ? "completed" : "active",
    completedAt: remaining <= 0 ? serverTimestamp() : null,
  });
};

export const incrementPackageSession = async (
  clientId: string,
  packageId: string
) => {
  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const pkg = snap.data() as ClientPackage;
  console.log("incrementPackageSession - current package:", pkg);

  // 🚫 Do NOT refund expired / completed packages
  if (pkg.status !== "active") {
    console.log("Package not active — skipping increment");
    return;
  }

  await setDoc(
    ref,
    {
      sessionsRemaining: firestore.FieldValue.increment(1),
    },
    { merge: true }
  );
};


export const cancelPackage = async (clientId: string, packageId: string) => {
  await setDoc(
    doc("clients", clientId, "packages", packageId),
    {
      status: "cancelled",
      cancelledAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/* ------------------ REACTIVATE PACKAGE ------------------ */
export const reactivatePackage = async (
  clientId: string,
  packageId: string
) => {
  await setDoc(
    doc("clients", clientId, "packages", packageId),
    {
      status: "active",
      reactivatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
