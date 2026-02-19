import firestore from "@react-native-firebase/firestore";
import { root } from "./db";

type ResolveAttendanceParams = {
  trainerId: string;
  dateKey: string;
  scheduleSessionId: string;
  clientId: string;
  clientPackageId: string;
  mode: "confirmed" | "no_show" | "charged-no-show";
};

const trainerToClientStatusMap = {
  confirmed: "confirmed",
  no_show: "postponed",
  "charged-no-show": "charged",
} as const;

export async function resolveAttendance({
  trainerId,
  dateKey,
  scheduleSessionId,
  clientId,
  clientPackageId,
  mode,
}: ResolveAttendanceParams) {
  console.info("[Attendance:resolveAttendance] START", {
    trainerId,
    dateKey,
    scheduleSessionId,
    clientId,
    clientPackageId,
    mode,
  });

  const dbRoot = root(); // ✅ ENV ROOT
  const clientStatus = trainerToClientStatusMap[mode];

  const scheduleRef = dbRoot
    .collection("trainer_schedules")
    .doc(trainerId)
    .collection("days")
    .doc(dateKey)
    .collection("sessions")
    .doc(scheduleSessionId);

  const clientSessionRef = dbRoot
    .collection("clients")
    .doc(clientId)
    .collection("sessions")
    .doc(scheduleSessionId);

  const packageRef = dbRoot
    .collection("clients")
    .doc(clientId)
    .collection("packages")
    .doc(clientPackageId);

  await firestore().runTransaction(async (tx) => {
    const scheduleSnap = await tx.get(scheduleRef);

    if (!scheduleSnap.exists) {
      throw new Error("Scheduled session not found");
    }

    const schedule = scheduleSnap.data()!;

    if (schedule.attendance !== "pending") {
      throw new Error("Session already resolved");
    }

    /* ================= PACKAGE LOGIC ================= */

    if (mode === "confirmed" || mode === "charged-no-show") {
      const packageSnap = await tx.get(packageRef);

      if (!packageSnap.exists) {
        throw new Error("Active package not found.");
      }

      const pkg = packageSnap.data()!;

      if (pkg.sessionsRemaining <= 0) {
        throw new Error("No sessions remaining");
      }

      const newRemaining = pkg.sessionsRemaining - 1;

      const packageUpdate: any = {
        sessionsRemaining: newRemaining,
      };

      if (newRemaining === 0) {
        packageUpdate.status = "completed";
        packageUpdate.completedAt =
          firestore.FieldValue.serverTimestamp();
      }

      tx.update(packageRef, packageUpdate);

      tx.update(clientSessionRef, {
        attendance: clientStatus,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }

    /* ================= UPDATE SCHEDULE ================= */

    tx.update(scheduleRef, {
      attendance: mode,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  console.info("[Attendance:resolveAttendance] SUCCESS", {
    scheduleSessionId,
    mode,
  });
}