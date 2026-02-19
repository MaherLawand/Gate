import firestore from "@react-native-firebase/firestore";
import dayjs from "dayjs";
import { createClientNotification } from "./notificationService";
import {log,warn,error,info} from "../../utils/logger"
type UpdateSessionReminderParams = {
  clientId: string;
  sessionId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
};

export async function updateSessionReminder({
  clientId,
  sessionId,
  sessionDate,
  startTime,
}: UpdateSessionReminderParams) {
  const db = firestore();

  const sessionStart = dayjs(
    `${sessionDate} ${startTime}`,
    "YYYY-MM-DD HH:mm"
  );

  const reminderTime = sessionStart.subtract(1, "hour");

  // ❌ Do not create reminders in the past
  if (reminderTime.isBefore(dayjs())) {
    info("[Reminder] Skipped (past time)", {
      sessionId,
      reminderTime: reminderTime.toISOString(),
    });
    return;
  }

  const notificationsRef = db
    .collection("clients")
    .doc(clientId)
    .collection("notifications");

  /* ---------------- DELETE OLD UNSENT REMINDERS ---------------- */

  const existingSnap = await notificationsRef
    .where("relatedSessionId", "==", sessionId)
    .where("type", "==", "session_reminder")
    .where("sent", "==", false)
    .get();

  const batch = db.batch();
  existingSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  /* ---------------- CREATE NEW REMINDER ---------------- */

  await createClientNotification({
    clientId,
    type: "session_reminder",
    title: "Upcoming training session",
    body: `Your session starts at ${startTime}`,
    route: "/client/Info",
    params: { sessionId },
    scheduledFor: firestore.Timestamp.fromDate(reminderTime.toDate()),
    relatedSessionId: sessionId,
  });

  info("[Reminder] Updated successfully", {
    sessionId,
    scheduledFor: reminderTime.toISOString(),
  });
}