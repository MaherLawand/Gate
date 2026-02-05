import firestore from "@react-native-firebase/firestore";

type ResolveAttendanceParams = {
  trainerId: string;
  dateKey: string;
  scheduleSessionId: string;
  clientId: string;
  clientPackageId: string;
  mode: "confirmed" | "no_show" | "charged-no-show";
};

// 🔁 Trainer → Client mapping
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

  const db = firestore();
  const clientStatus = trainerToClientStatusMap[mode];

  const scheduleRef = db
    .collection("trainer_schedules")
    .doc(trainerId)
    .collection("days")
    .doc(dateKey)
    .collection("sessions")
    .doc(scheduleSessionId);

    const clientSessionRef = db
    .collection("clients")
    .doc(clientId)
    .collection("sessions")
    .doc(scheduleSessionId);

  const packageRef = db
    .collection("clients")
    .doc(clientId)
    .collection("packages")
    .doc(clientPackageId);

  await db.runTransaction(async (tx) => {
    console.info("[Attendance:transaction] Fetching schedule");

    const scheduleSnap = await tx.get(scheduleRef);

    if (!scheduleSnap.exists) {
      console.error("[Attendance] Schedule not found", {
        scheduleSessionId,
      });
      throw new Error("Scheduled session not found");
    }

    const schedule = scheduleSnap.data()!;

    if (schedule.attendance !== "pending") {
      console.warn("[Attendance] Session already resolved", {
        attendance: schedule.attendance,
      });
      throw new Error("Session already resolved");
    }

    // ----------------------------------------
    // 🔥 Handle package logic
    // ----------------------------------------

    if (mode === "confirmed" || mode === "charged-no-show") {
      console.info("[Attendance] Package decrement required", { mode });

      const packageSnap = await tx.get(packageRef);

      if (!packageSnap.exists) {
        console.error("[Attendance] Package not found", {
          clientPackageId,
        });
        throw new Error(
          "Active package not found. Session may have been edited incorrectly."
        );
      }

      const pkg = packageSnap.data()!;

      if (pkg.sessionsRemaining <= 0) {
        console.error("[Attendance] No sessions remaining", {
          remaining: pkg.sessionsRemaining,
        });
        throw new Error("No sessions remaining");
      }

      const newRemaining = pkg.sessionsRemaining - 1;

      console.info("[Attendance] Updating package sessions", {
        from: pkg.sessionsRemaining,
        to: newRemaining,
      });

      const packageUpdate: any = {
        sessionsRemaining: newRemaining,
      };

      // ✅ AUTO-COMPLETE PACKAGE
      if (newRemaining === 0) {
        console.info("[Attendance] Package completed");

        packageUpdate.status = "completed";
        packageUpdate.completedAt = firestore.FieldValue.serverTimestamp();
      }

      tx.update(packageRef, packageUpdate);

      const now = firestore.FieldValue.serverTimestamp();
      
      tx.update(clientSessionRef, {
        attendance: clientStatus,
        updatedAt: now,
      });

      // ✅ Create client session ONLY if attended
      if (mode === "confirmed") {
        console.info("[Attendance] Creating client session record");

        const clientSessionRef = db
          .collection("clients")
          .doc(clientId)
          .collection("sessions")
          .doc(scheduleSessionId);

        tx.update(clientSessionRef, {
          attendance: "confirmed",
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // ----------------------------------------
    // ✅ Update attendance on schedule
    // ----------------------------------------

    console.info("[Attendance] Updating schedule attendance", { mode });

    tx.update(scheduleRef, {
      attendance: mode,
    });
  });

  console.info("[Attendance:resolveAttendance] SUCCESS", {
    scheduleSessionId,
    mode,
  });
}
