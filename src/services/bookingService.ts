import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { lockGymTimeSlot } from "./SlotLockService";

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
    console.error("[BookingService] Permission denied", {
      authUid: user?.uid,
      trainerId,
    });
    throw new Error("Permission denied");
  }

  if (toTime <= fromTime) {
    console.warn("[BookingService] Invalid time range");
    throw new Error("Invalid time range");
  }

  const newStart = fromTime.getHours() * 60 + fromTime.getMinutes();
  const newEnd = toTime.getHours() * 60 + toTime.getMinutes();

  /* ---------------- PAST DATE / TIME CHECK ---------------- */

  const now = new Date();
  const bookingDate = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookingDate < today) {
    console.warn("[BookingService] Attempted booking in the past", { dateKey });
    throw new Error("You cannot book old sessions");
  }

  if (bookingDate.getTime() === today.getTime()) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (newStart <= nowMinutes) {
      console.warn("[BookingService] Attempted booking earlier today");
      throw new Error("You cannot book a session in the past");
    }
  }

  const db = firestore();

  const sessionsRef = db
    .collection("trainer_schedules")
    .doc(trainerId)
    .collection("days")
    .doc(dateKey)
    .collection("sessions");

  /* ---------------- RULE 1: CLIENT SAME DAY ---------------- */

  const existingClientSnap = await sessionsRef
    .where("clientId", "==", selectedClient.id)
    .get();

  const hasClientConflict = existingClientSnap.docs.some(
    (d) => d.id !== editingSession?.id
  );

  if (hasClientConflict) {
    console.warn("[BookingService] Client already booked on this day", {
      clientId: selectedClient.id,
    });
    throw new Error("This client already has a session booked on this day");
  }

  /* ---------------- RULE 2: TRAINER OVERLAP ---------------- */

  const trainerSessionsSnap = await sessionsRef.get();

  console.log("TrainerSessionsSnap: ", trainerSessionsSnap)

  const trainerOverlap = trainerSessionsSnap.docs.some((doc) => {
    if (doc.id === editingSession?.id) return false;
    const s = doc.data();
    return newStart < timeToMinutes(s.endTime) &&
           newEnd > timeToMinutes(s.startTime);
  });

  if (trainerOverlap) {
    console.warn("[BookingService] Trainer time overlap detected");
    throw new Error("This time overlaps with another session");
  }

  /* ---------------- RULE 3: ACTIVE PACKAGE ---------------- */

  let clientPackageId = editingSession?.clientPackageId;

  if (!editingSession) {
    const packageSnap = await db
      .collection("clients")
      .doc(selectedClient.id)
      .collection("packages")
      .where("status", "==", "active")
      .where("sessionsRemaining", ">", 0)
      .limit(1)
      .get();

    if (packageSnap.empty) {
      console.warn("[BookingService] No active package", {
        clientId: selectedClient.id,
      });
      throw new Error("Client has no active package");
    }

    clientPackageId = packageSnap.docs[0].id;
  }

  /* ---------------- SESSION ID ---------------- */

  const sessionId = editingSession
    ? editingSession.id
    : sessionsRef.doc().id;

  console.info("[BookingService] Session ID resolved", { sessionId });

  /* ---------------- SLOT LOCK ---------------- */

  if (
    editingSession &&
    (editingSession.startTime !== formatTime(fromTime) ||
      editingSession.endTime !== formatTime(toTime))
  ) {
    console.info("[BookingService] Releasing previous slot lock", {
      sessionId,
    });

    await db
      .collection("gym_time_slots")
      .doc(editingSession.id)
      .delete()
      .catch(() => {});
  }

  console.info("[BookingService] Locking gym time slot");

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
    attendance: editingSession ? editingSession.attendance : "pending",
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  if (editingSession) {
    await sessionsRef.doc(sessionId).update(payload);
  } else {
    await sessionsRef.doc(sessionId).set({
      ...payload,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  console.info("[BookingService] Booking saved successfully", { sessionId });

  return { success: true, sessionId };
}