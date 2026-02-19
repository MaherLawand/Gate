import firestore from "@react-native-firebase/firestore";
import { ScheduledSession } from "../types/models";
import { root } from "./db";
import {log,warn,error,info} from "../utils/logger"

export async function cancelBooking({
  trainerId,
  session,
}: {
  trainerId: string;
  session: ScheduledSession;
}) {
  info("🟡 [CancelBooking] START (atomic batch)", {
    trainerId,
    sessionId: session.id,
    clientId: session.clientId,
    date: session.date,
  });

  const batch = firestore().batch();

  try {
    /* ================= SLOT LOCKS ================= */

    const slotsSnap = await root()
      .collection("gym_time_slots")
      .where("sessionId", "==", session.id)
      .get();

    info("🔍 Slot locks found", {
      count: slotsSnap.size,
    });

    slotsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    /* ================= TRAINER SESSION ================= */

    const trainerSessionRef = root()
      .collection("trainer_schedules")
      .doc(trainerId)
      .collection("days")
      .doc(session.date)
      .collection("sessions")
      .doc(session.id);

    batch.delete(trainerSessionRef);

    /* ================= CLIENT SESSION ================= */

    const clientSessionRef = root()
      .collection("clients")
      .doc(session.clientId)
      .collection("sessions")
      .doc(session.id);

    batch.delete(clientSessionRef);

    /* ================= CLIENT NOTIFICATIONS ================= */

    const notificationsSnap = await root()
      .collection("clients")
      .doc(session.clientId)
      .collection("notifications")
      .where("relatedSessionId", "==", session.id)
      .where("sent", "==", false)
      .get();

    notificationsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    /* ================= COMMIT ================= */

    await batch.commit();

    info("✅ [CancelBooking] SUCCESS (atomic)", {
      sessionId: session.id,
    });
  } catch (error: any) {
    error("🔥 [CancelBooking] FAILED (nothing deleted)", {
      sessionId: session.id,
      code: error?.code,
      message: error?.message,
    });

    throw new Error("Failed to cancel booking. No changes were applied.");
  }
}