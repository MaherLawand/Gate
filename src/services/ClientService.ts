import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { auth } from "../services/firebase";

import { router } from "expo-router";
import { Alert } from "react-native";

import {
  ClientPackage,
  ClientProfile,
  SessionData,
  SessionExercise,
  SessionWithId,
} from "../types/models";

import {
  addDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "../services/fireStoreHelpers";

import { db, root, collection,doc } from "./db";
import {log,warn,error,info} from "../utils/logger"




export const redirectAfterLogin = async (uid: string) => {
  info("[Auth] redirectAfterLogin:start", { uid });

  const snap = await getDoc(doc("users", uid));

  if (!snap.exists()) {
    warn("[Auth] User record not found", { uid });
    return;
  }

  const { role } = snap.data();

  info("[Auth] User role resolved", { uid, role });

  if (role === "trainer") {
    router.replace("/(app)/trainer/dashboard");
  } else if (role === "client") {
    router.replace("/(app)/client/Gate");
  } else {
    error("[Auth] Invalid user role", { uid, role });
    Alert.alert("Error", "Invalid user role");
  }
};

/* ------------------ ADD CLIENT ------------------ */

export async function addClient(
  data: Omit<
    ClientProfile,
    "trainerId" | "trainerName" | "createdAt" | "isActive"
  >
) {
  const user = auth().currentUser;

  if (!user) {
    error("[ClientService:addClient] Not authenticated");
    throw new Error("Not authenticated");
  }

  info("[ClientService:addClient] Start", {
    trainerId: user.uid,
  });

  const newClient: ClientProfile = {
    ...data,
    trainerId: user.uid,
    trainerName: user.email ?? "",
    isActive: true,
    authUid: null,
    phoneVerified: false,
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection("clients"), newClient);

    info("[ClientService:addClient] Success", {
      clientId: ref.id,
    });

    return { ...newClient, id: ref.id };
  } catch (e: any) {
    error("[ClientService:addClient] Failed", {
      message: e.message,
    });
    throw e;
  }
}

//* ------------------ GET TRAINER CLIENTS ------------------ */

export async function getTrainerClients() {
  const uid = auth().currentUser?.uid;

  if (!uid) {
    warn("[ClientService:getTrainerClients] No authenticated user");
    return [];
  }

  info("[ClientService:getTrainerClients] Fetching", { uid });

  const snap = await collection("clients")
    .where("trainerId", "==", uid)
    .orderBy("createdAt", "desc")
    .get();

  info("[ClientService:getTrainerClients] Result", {
    count: snap.size,
  });

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as ClientProfile),
  }));
}

/* ------------------ UPDATE / ARCHIVE CLIENT ------------------ */

export const updateClient = async (
  clientId: string,
  data: Partial<ClientProfile>
) => {
  info("[ClientService:updateClient]", { clientId });
  await setDoc(doc("clients", clientId), data, { merge: true });
};

export const archiveClient = async (clientId: string) => {
  info("[ClientService:archiveClient]", { clientId });

  await setDoc(
    doc("clients", clientId),
    { isActive: false, archivedAt: new Date() },
    { merge: true }
  );
};

export const unarchiveClient = async (clientId: string) => {
  info("[ClientService:unarchiveClient]", { clientId });

  await setDoc(
    doc("clients", clientId),
    { isActive: true, archivedAt: null },
    { merge: true }
  );
};

export async function deleteClient(clientId: string) {
  info("[ClientService:deleteClient]", { clientId });
  await deleteDoc(doc("clients", clientId));
}

export type ExerciseEntry = {
  id: any;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
};

/* ------------------ CLIENT SESSIONS ------------------ */

export const addSession = async (
  clientId: string,
  data: {
    date: string;
    exercises: SessionExercise[];
    packageId: string;
  }
) => {
  info("[Session:addSession]", { clientId, date: data.date });

  await addDoc(collection("clients", clientId, "sessions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const getClientSessions = async (
  clientId: string
): Promise<SessionWithId[]> => {
  info("[Session:getClientSessions]", { clientId });

  const snap = await collection("clients", clientId, "sessions").get();

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as SessionData),
  }));
};

export const updateSession = async (
  clientId: string,
  sessionId: string,
    data: Partial<SessionData>
) => {
  info("[Session:updateSession]", { clientId, sessionId });

  await setDoc(doc("clients", clientId, "sessions", sessionId), data, {
    merge: true,
  });
};

export const deleteClientSession = async (
  clientId: string,
  sessionId: string
) => {
  info("[Session:deleteClientSession]", { clientId, sessionId });
  await deleteDoc(doc("clients", clientId, "sessions", sessionId));
};

/* ------------------ PACKAGES ------------------ */

export const addClientPackage = async (
  clientId: string,
  data: {
    price: number;
    totalSessions: number;
    sessionsRemaining: number;
    isPaid: boolean;
  }
) => {
  info("[Package:addClientPackage]", {
    clientId,
    totalSessions: data.totalSessions,
  });

  await addDoc(collection("clients", clientId, "packages"), {
    ...data,
    status: "active",
    createdAt: serverTimestamp(),
    paidAt: data.isPaid ? serverTimestamp() : null,
  });

  info("[Package:addClientPackage] success", { clientId });
};

export const renewPackage = async (
  clientId: string,
  data: {
    price: number;
    totalSessions: number;
    isPaid: boolean;
  }
) => {
  info("[Package:renewPackage] start", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  info("[Package:renewPackage] active packages found", {
    count: snap.docs.length,
  });

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

  await addDoc(collection("clients", clientId, "packages"), {
    price: data.price,
    totalSessions: data.totalSessions,
    sessionsRemaining: data.totalSessions,
    isPaid: data.isPaid,
    status: "active",
    createdAt: serverTimestamp(),
    paidAt: data.isPaid ? serverTimestamp() : null,
  });

  info("[Package:renewPackage] success", { clientId });
};

export const getClientPackages = async (
  clientId: string
): Promise<ClientPackage[]> => {
  info("[Package:getClientPackages]", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .orderBy("createdAt", "desc")
    .get();

  info("[Package:getClientPackages] result", {
    count: snap.docs.length,
  });

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as ClientPackage),
  }));
};

/* ------------------ GET ACTIVE PACKAGE ------------------ */

export const getActivePackage = async (
  clientId: string
): Promise<ClientPackage | null> => {
  info("[Package:getActivePackage]", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  if (snap.empty) {
    info("[Package:getActivePackage] none found", { clientId });
    return null;
  }

  const d = snap.docs[0];
  info("[Package:getActivePackage] found", {
    clientId,
    packageId: d.id,
  });

  return { id: d.id, ...(d.data() as ClientPackage) };
};

/* ------------------ UPDATE PACKAGE ------------------ */

export const updatePackage = async (
  clientId: string,
  packageId: string,
  data: Partial<ClientPackage>
) => {
  info("[Package:updatePackage]", { clientId, packageId });

  await setDoc(doc("clients", clientId, "packages", packageId), data, {
    merge: true,
  });
};

export const consumePackageSession = async (
  clientId: string,
  packageId: string
) => {
  info("[Package:consumePackageSession]", { clientId, packageId });

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

  info("[Package:refreshPackageStatus]", {
    clientId,
    packageId: pkg.id,
    status,
  });

  await setDoc(
    doc("clients", clientId, "packages", pkg.id!),
    { status },
    { merge: true }
  );
};

export const completeActivePackage = async (clientId: string) => {
  info("[Package:completeActivePackage]", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  for (const docSnap of snap.docs) {
    await setDoc(docSnap.ref, { status: "completed" }, { merge: true });
  }

  info("[Package:completeActivePackage] completed", {
    count: snap.docs.length,
  });
};

// ClientService.ts

export const deletePackage = async (clientId: string, packageId: string) => {
  info("[Package:deletePackage]", { clientId, packageId });

  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    warn("[Package:deletePackage] not found", { packageId });
    return;
  }

  const data = snap.data();

  if (data.status !== "active") {
    error("[Package:deletePackage] denied - not active", {
      packageId,
      status: data.status,
    });
    throw new Error("Only active packages can be deleted");
  }

  await deleteDoc(ref);
  info("[Package:deletePackage] success", { packageId });
};

export const decrementPackageSession = async (
  clientId: string,
  packageId: string
) => {
  info("[Package:decrementPackageSession]", { clientId, packageId });

  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    warn("[Package:decrementPackageSession] package not found", {
      packageId,
    });
    return;
  }

  const data = snap.data() as ClientPackage;

  if (data.sessionsRemaining <= 0) {
    error("[Package:decrementPackageSession] no sessions remaining", {
      packageId,
    });
    throw new Error("No sessions remaining to decrement");
  }

  const remaining = data.sessionsRemaining - 1;

  await updatePackage(clientId, packageId, {
    sessionsRemaining: remaining,
    status: remaining <= 0 ? "completed" : "active",
    completedAt: remaining <= 0 ? serverTimestamp() : null,
  });

  info("[Package:decrementPackageSession] success", {
    packageId,
    remaining,
  });
};

export const incrementPackageSession = async (
  clientId: string,
  packageId: string
) => {
  info("[Package:incrementPackageSession]", { clientId, packageId });

  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    warn("[Package:incrementPackageSession] package not found", {
      packageId,
    });
    return;
  }

  const pkg = snap.data() as ClientPackage;

  if (pkg.status !== "active") {
    warn("[Package:incrementPackageSession] skipped - not active", {
      packageId,
      status: pkg.status,
    });
    return;
  }

  await setDoc(
    ref,
    {
      sessionsRemaining: firestore.FieldValue.increment(1),
    },
    { merge: true }
  );

  info("[Package:incrementPackageSession] success", { packageId });
};

export const cancelPackage = async (clientId: string, packageId: string) => {
  info("[Package:cancelPackage]", { clientId, packageId });

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
  info("[Package:reactivatePackage]", { clientId, packageId });

  await setDoc(
    doc("clients", clientId, "packages", packageId),
    {
      status: "active",
      reactivatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export async function clientExistsByPhone(phone: string) {
const snap = await collection("clients")
  .where("phone", "==", phone)
  .limit(1)
  .get();

  return !snap.empty;
}

/* ------------------ DELETE EXERCISE FROM SESSION ------------------ */

export const deleteExerciseFromSession = async (
  clientId: string,
  sessionId: string,
  exerciseId: string
) => {
  info("[Session:deleteExerciseFromSession]", {
    clientId,
    sessionId,
    exerciseId,
  });

  const sessionRef = doc("clients", clientId, "sessions", sessionId);
  const snap = await getDoc(sessionRef);

  if (!snap.exists()) {
    warn("[Session:deleteExerciseFromSession] session not found", {
      sessionId,
    });
    return;
  }

  const data = snap.data() as SessionData;

  const updatedExercises = data.exercises.filter(
    (ex) => ex.exerciseId !== exerciseId
  );

  await setDoc(
    sessionRef,
    {
      exercises: updatedExercises,
    },
    { merge: true }
  );

  info("[Session:deleteExerciseFromSession] success", {
    remaining: updatedExercises.length,
  });
};
