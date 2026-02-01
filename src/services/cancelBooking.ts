import firestore from "@react-native-firebase/firestore";
import { ScheduledSession } from "../types/models";

export async function cancelBooking({
  trainerId,
  session,
}: {
  trainerId: string;
  session: ScheduledSession;
}) {
  console.info("[CancelBooking] Start", {
    trainerId,
    sessionId: session.id,
    date: session.date,
  });

  const db = firestore();

  try {
    await db.runTransaction(async (tx) => {
      console.info("[CancelBooking] Transaction started");

      /* ---------------- SLOT LOCKS ---------------- */

      const slotsSnap = await db
        .collection("gym_time_slots")
        .where("sessionId", "==", session.id)
        .get();

      console.info("[CancelBooking] Slot locks found", {
        count: slotsSnap.size,
      });

      for (const slotDoc of slotsSnap.docs) {
        console.info("[CancelBooking] Deleting slot lock", {
          slotId: slotDoc.id,
        });
        tx.delete(slotDoc.ref);
      }

      /* ---------------- TRAINER SESSION ---------------- */

      const sessionRef = db
        .collection("trainer_schedules")
        .doc(trainerId)
        .collection("days")
        .doc(session.date)
        .collection("sessions")
        .doc(session.id);

      console.info("[CancelBooking] Deleting trainer session", {
        trainerId,
        sessionId: session.id,
      });

      tx.delete(sessionRef);
    });

    console.info("[CancelBooking] Success", {
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("[CancelBooking] Failed", {
      sessionId: session.id,
      message: error?.message,
    });
    throw error;
  }
}
