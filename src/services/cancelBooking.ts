import { ScheduledSession } from "../types/models";
import { firestore } from "./firebase";

export async function cancelBooking({
    trainerId,
    session,
  }: {
    trainerId: string;
    session: ScheduledSession;
  }) {
    const db = firestore();
  
    await db.runTransaction(async (tx) => {
      const slotsSnap = await db
        .collection("gym_time_slots")
        .where("sessionId", "==", session.id)
        .get();
  
      slotsSnap.docs.forEach((doc) => tx.delete(doc.ref));
  
      tx.delete(
        db
          .collection("trainer_schedules")
          .doc(trainerId)
          .collection("days")
          .doc(session.date)
          .collection("sessions")
          .doc(session.id)
      );
    });
  }