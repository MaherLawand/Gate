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
  console.info("[Auth] redirectAfterLogin:start", { uid });

  const snap = await getDoc(doc("users", uid));

  if (!snap.exists) {
    console.warn("[Auth] User record not found", { uid });
    return;
  }

  const { role } = snap.data();

  console.info("[Auth] User role resolved", { uid, role });

  if (role === "trainer") {
    router.replace("/trainer/dashboard");
  } else if (role === "client") {
    router.replace("/client/Gate");
  } else {
    console.error("[Auth] Invalid user role", { uid, role });
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
    console.error("[ClientService:addClient] Not authenticated");
    throw new Error("Not authenticated");
  }

  console.info("[ClientService:addClient] Start", {
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

    console.info("[ClientService:addClient] Success", {
      clientId: ref.id,
    });

    return { ...newClient, id: ref.id };
  } catch (e: any) {
    console.error("[ClientService:addClient] Failed", {
      message: e.message,
    });
    throw e;
  }
}

//* ------------------ GET TRAINER CLIENTS ------------------ */

export async function getTrainerClients() {
  const uid = auth().currentUser?.uid;

  if (!uid) {
    console.warn("[ClientService:getTrainerClients] No authenticated user");
    return [];
  }

  console.info("[ClientService:getTrainerClients] Fetching", { uid });

  const snap = await collection("clients")
    .where("trainerId", "==", uid)
    .orderBy("createdAt", "desc")
    .get();

  console.info("[ClientService:getTrainerClients] Result", {
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
  console.info("[ClientService:updateClient]", { clientId });
  await setDoc(doc("clients", clientId), data, { merge: true });
};

export const archiveClient = async (clientId: string) => {
  console.info("[ClientService:archiveClient]", { clientId });

  await setDoc(
    doc("clients", clientId),
    { isActive: false, archivedAt: new Date() },
    { merge: true }
  );
};

export const unarchiveClient = async (clientId: string) => {
  console.info("[ClientService:unarchiveClient]", { clientId });

  await setDoc(
    doc("clients", clientId),
    { isActive: true, archivedAt: null },
    { merge: true }
  );
};

export async function deleteClient(clientId: string) {
  console.info("[ClientService:deleteClient]", { clientId });
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
  console.info("[Session:addSession]", { clientId, date: data.date });

  await addDoc(collection("clients", clientId, "sessions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const getClientSessions = async (
  clientId: string
): Promise<SessionWithId[]> => {
  console.info("[Session:getClientSessions]", { clientId });

  const snap = await collection("clients", clientId, "sessions").get();

  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as SessionData),
  }));
};

export const updateSession = async (
  clientId: string,
  sessionId: string,
  data: SessionData
) => {
  console.info("[Session:updateSession]", { clientId, sessionId });

  await setDoc(doc("clients", clientId, "sessions", sessionId), data, {
    merge: true,
  });
};

export const deleteClientSession = async (
  clientId: string,
  sessionId: string
) => {
  console.info("[Session:deleteClientSession]", { clientId, sessionId });
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
  console.info("[Package:addClientPackage]", {
    clientId,
    totalSessions: data.totalSessions,
  });

  await addDoc(collection("clients", clientId, "packages"), {
    ...data,
    status: "active",
    createdAt: serverTimestamp(),
    paidAt: data.isPaid ? serverTimestamp() : null,
  });

  console.info("[Package:addClientPackage] success", { clientId });
};

export const renewPackage = async (
  clientId: string,
  data: {
    price: number;
    totalSessions: number;
    isPaid: boolean;
  }
) => {
  console.info("[Package:renewPackage] start", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  console.info("[Package:renewPackage] active packages found", {
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

  console.info("[Package:renewPackage] success", { clientId });
};

export const getClientPackages = async (
  clientId: string
): Promise<ClientPackage[]> => {
  console.info("[Package:getClientPackages]", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .orderBy("createdAt", "desc")
    .get();

  console.info("[Package:getClientPackages] result", {
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
  console.info("[Package:getActivePackage]", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  if (snap.empty) {
    console.info("[Package:getActivePackage] none found", { clientId });
    return null;
  }

  const d = snap.docs[0];
  console.info("[Package:getActivePackage] found", {
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
  console.info("[Package:updatePackage]", { clientId, packageId });

  await setDoc(doc("clients", clientId, "packages", packageId), data, {
    merge: true,
  });
};

export const consumePackageSession = async (
  clientId: string,
  packageId: string
) => {
  console.info("[Package:consumePackageSession]", { clientId, packageId });

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

  console.info("[Package:refreshPackageStatus]", {
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
  console.info("[Package:completeActivePackage]", { clientId });

  const snap = await collection("clients", clientId, "packages")
    .where("status", "==", "active")
    .get();

  for (const docSnap of snap.docs) {
    await setDoc(docSnap.ref, { status: "completed" }, { merge: true });
  }

  console.info("[Package:completeActivePackage] completed", {
    count: snap.docs.length,
  });
};

// ClientService.ts

export const deletePackage = async (clientId: string, packageId: string) => {
  console.info("[Package:deletePackage]", { clientId, packageId });

  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.warn("[Package:deletePackage] not found", { packageId });
    return;
  }

  const data = snap.data();

  if (data.status !== "active") {
    console.error("[Package:deletePackage] denied - not active", {
      packageId,
      status: data.status,
    });
    throw new Error("Only active packages can be deleted");
  }

  await deleteDoc(ref);
  console.info("[Package:deletePackage] success", { packageId });
};

export const decrementPackageSession = async (
  clientId: string,
  packageId: string
) => {
  console.info("[Package:decrementPackageSession]", { clientId, packageId });

  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.warn("[Package:decrementPackageSession] package not found", {
      packageId,
    });
    return;
  }

  const data = snap.data() as ClientPackage;

  if (data.sessionsRemaining <= 0) {
    console.error("[Package:decrementPackageSession] no sessions remaining", {
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

  console.info("[Package:decrementPackageSession] success", {
    packageId,
    remaining,
  });
};

export const incrementPackageSession = async (
  clientId: string,
  packageId: string
) => {
  console.info("[Package:incrementPackageSession]", { clientId, packageId });

  const ref = doc("clients", clientId, "packages", packageId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.warn("[Package:incrementPackageSession] package not found", {
      packageId,
    });
    return;
  }

  const pkg = snap.data() as ClientPackage;

  if (pkg.status !== "active") {
    console.warn("[Package:incrementPackageSession] skipped - not active", {
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

  console.info("[Package:incrementPackageSession] success", { packageId });
};

export const cancelPackage = async (clientId: string, packageId: string) => {
  console.info("[Package:cancelPackage]", { clientId, packageId });

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
  console.info("[Package:reactivatePackage]", { clientId, packageId });

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
  const snap = await firestore()
    .collection("clients")
    .where("phone", "==", phone)
    .limit(1)
    .get();

  return !snap.empty;
}
