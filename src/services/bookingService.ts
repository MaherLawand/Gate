import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { lockGymTimeSlot } from "./SlotLockService";
import { updateSessionReminder } from "./notifications/sessionReminderService";
import { db, root } from "./db";
/* ---------------- TYPES ---------------- */

type SelectedClient = {
  id: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  isHijabi?: boolean;
};

type EditingSession = {
  id: string;
  clientPackageId?: string;
  startTime: string;
  endTime: string;
  attendance: string;
} | null;

type BookSessionParams = {
  trainerId: string;
  dateKey: string;
  selectedClient: SelectedClient;
  fromTime: Date;
  toTime: Date;
  editingSession?: EditingSession;
};

type SessionStatus =
  | "pending" // just booked
  | "confirmed" // attended
  | "postponed" // rescheduled / postponed
  | "charged"; // no-show but charged

/* ---------------- HELPERS ---------------- */

const formatTime = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/* ---------------- MAIN ---------------- */
export async function updateSessionStatus({
  trainerId,
  clientId,
  dateKey,
  sessionId,
  status,
}: {
  trainerId: string;
  clientId: string;
  dateKey: string;
  sessionId: string;
  status: "pending" | "confirmed" | "postponed" | "charged";
}) {
  const batch = db.batch();

  const trainerRef = root()
    .collection("trainer_schedules")
    .doc(trainerId)
    .collection("days")
    .doc(dateKey)
    .collection("sessions")
    .doc(sessionId);

  const clientRef = root()
    .collection("clients")
    .doc(clientId)
    .collection("sessions")
    .doc(sessionId);

  batch.update(trainerRef, {
    status,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  batch.update(clientRef, {
    status,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
const WORK_START_MINUTES = 6 * 60; // 06:00
const WORK_END_MINUTES = 21 * 60; // 21:00

export async function bookSession({
  trainerId,
  dateKey,
  selectedClient,
  fromTime,
  toTime,
  editingSession,
}: BookSessionParams) {
  console.info("[BookingService] bookSession → start", {
    trainerId,
    dateKey,
    editing: Boolean(editingSession),
  });

  const user = auth().currentUser;

  if (!user || user.uid !== trainerId) {
    throw new Error("Permission denied");
  }

  if (toTime <= fromTime) {
    throw new Error("Invalid time range");
  }

  const newStart = fromTime.getHours() * 60 + fromTime.getMinutes();
  const newEnd = toTime.getHours() * 60 + toTime.getMinutes();

  if (newEnd - newStart !== 60) {
    throw new Error("Sessions must be exactly 1 hour long");
  }

  if (newStart < WORK_START_MINUTES || newEnd > WORK_END_MINUTES) {
    throw new Error("Sessions must be between 06:00 and 21:00");
  }

  /* ---------------- PAST CHECK ---------------- */

  const now = new Date();
  const bookingDate = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookingDate < today) {
    throw new Error("You cannot book old sessions");
  }

  if (bookingDate.getTime() === today.getTime()) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (newStart <= nowMinutes) {
      throw new Error("You cannot book a session in the past");
    }
  }

  /* 🔒 Ensure trainer_schedules parent exists */

  await root()
    .collection("trainer_schedules")
    .doc(trainerId)
    .set(
      {
        trainerId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  const sessionsRef = root()
    .collection("trainer_schedules")
    .doc(trainerId)
    .collection("days")
    .doc(dateKey)
    .collection("sessions");

  /* ---------------- RULE 1: CLIENT SAME DAY ---------------- */

  const existingClientSnap = await sessionsRef
    .where("clientId", "==", selectedClient.id)
    .get();

  if (
    existingClientSnap.docs.some(
      (d) => d.id !== editingSession?.id
    )
  ) {
    throw new Error("This client already has a session booked on this day");
  }

  /* ---------------- RULE 2: TRAINER OVERLAP ---------------- */

  const trainerSessionsSnap = await sessionsRef.get();

  const trainerOverlap = trainerSessionsSnap.docs.some((doc) => {
    if (doc.id === editingSession?.id) return false;
    const s = doc.data();
    return (
      newStart < timeToMinutes(s.endTime) &&
      newEnd > timeToMinutes(s.startTime)
    );
  });

  if (trainerOverlap) {
    throw new Error("This time overlaps with another session");
  }

  /* ---------------- RULE 3: ACTIVE PACKAGE ---------------- */

  let clientPackageId = editingSession?.clientPackageId;

  if (!editingSession) {
    const packageSnap = await root()
      .collection("clients")
      .doc(selectedClient.id)
      .collection("packages")
      .where("status", "==", "active")
      .where("sessionsRemaining", ">", 0)
      .limit(1)
      .get();

    if (packageSnap.empty) {
      throw new Error("Client has no active package");
    }

    clientPackageId = packageSnap.docs[0].id;
  }

  const sessionId = editingSession
    ? editingSession.id
    : sessionsRef.doc().id;

  const clientSessionsRef = root()
    .collection("clients")
    .doc(selectedClient.id)
    .collection("sessions");

  /* ---------------- SLOT LOCK ---------------- */

  if (
    editingSession &&
    (editingSession.startTime !== formatTime(fromTime) ||
      editingSession.endTime !== formatTime(toTime))
  ) {
    await root()
      .collection("gym_time_slots")
      .doc(editingSession.id)
      .delete()
      .catch(() => {});
  }

  await lockGymTimeSlot({
    sessionId,
    date: dateKey,
    startTime: formatTime(fromTime),
    endTime: formatTime(toTime),
    trainerId,
    clientId: selectedClient.id,
    clientGender: selectedClient.gender,
    clientIsHijabi: selectedClient.isHijabi ?? false,
  });

  /* ---------------- SAVE SESSION ---------------- */

  const payload = {
    clientId: selectedClient.id,
    clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
    clientPackageId,
    date: dateKey,
    startTime: formatTime(fromTime),
    endTime: formatTime(toTime),
    clientGender: selectedClient.gender,
    isHijabi: selectedClient.isHijabi ?? false,
    attendance: editingSession
      ? editingSession.attendance
      : "pending",
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  const clientSessionPayload = {
    packageId: clientPackageId,
    date: dateKey,
    exercises: [],
    attendance: editingSession
      ? editingSession.attendance
      : "pending",
    startTime: formatTime(fromTime),
    endTime: formatTime(toTime),
    trainerId,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  if (editingSession) {
    await sessionsRef.doc(sessionId).update(payload);
    await clientSessionsRef.doc(sessionId).update({
      ...clientSessionPayload,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await sessionsRef.doc(sessionId).set({
      ...payload,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    await clientSessionsRef.doc(sessionId).set({
      ...clientSessionPayload,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  try {
    await updateSessionReminder({
      clientId: selectedClient.id,
      sessionId,
      sessionDate: dateKey,
      startTime: formatTime(fromTime),
    });
  } catch (err) {
    console.warn(
      "[BookingService] Reminder update failed (non-blocking)",
      err
    );
  }

  return { success: true, sessionId };
}
