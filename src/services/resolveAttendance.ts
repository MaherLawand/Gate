import firestore from "@react-native-firebase/firestore";

type ResolveAttendanceParams = {
  trainerId: string;
  dateKey: string;
  scheduleSessionId: string;
  clientId: string;
  clientPackageId: string;
  mode: "confirmed" | "no_show" | "charged-no-show";
};

export async function resolveAttendance({
  trainerId,
  dateKey,
  scheduleSessionId,
  clientId,
  clientPackageId,
  mode,
}: ResolveAttendanceParams) {
  const db = firestore();

  const scheduleRef = db
    .collection("trainer_schedules")
    .doc(trainerId)
    .collection("days")
    .doc(dateKey)
    .collection("sessions")
    .doc(scheduleSessionId);

  const packageRef = db
    .collection("clients")
    .doc(clientId)
    .collection("packages")
    .doc(clientPackageId);

  await db.runTransaction(async (tx) => {
    const scheduleSnap = await tx.get(scheduleRef);
    if (!scheduleSnap.exists) {
      throw new Error("Scheduled session not found");
    }

    const schedule = scheduleSnap.data()!;
    if (schedule.attendance !== "pending") {
      throw new Error("Session already resolved");
    }

    // ----------------------------------------
    // 🔥 Handle package logic
    // ----------------------------------------
    if (mode === "confirmed" || mode === "charged-no-show") {
      const packageSnap = await tx.get(packageRef);
      if (!packageSnap.exists) {
        throw new Error(
          "Active package not found. Session may have been edited incorrectly."
        );
      }

      const pkg = packageSnap.data()!;
      if (pkg.sessionsRemaining <= 0) {
        throw new Error("No sessions remaining");
      }

      const newRemaining = pkg.sessionsRemaining - 1;

      const packageUpdate: any = {
        sessionsRemaining: newRemaining,
      };

      // ✅ AUTO-COMPLETE PACKAGE
      if (newRemaining === 0) {
        packageUpdate.status = "completed";
        packageUpdate.completedAt = firestore.FieldValue.serverTimestamp();
      }

      tx.update(packageRef, packageUpdate);

      // ✅ Create client session ONLY if attended
      if (mode === "confirmed") {
        const clientSessionRef = db
          .collection("clients")
          .doc(clientId)
          .collection("sessions")
          .doc();

        tx.set(clientSessionRef, {
          packageId: clientPackageId,
          date: schedule.date,
          exercises: [],
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // ----------------------------------------
    // ✅ Update attendance on schedule
    // ----------------------------------------
    tx.update(scheduleRef, {
      attendance: mode,
    });
  });
}
