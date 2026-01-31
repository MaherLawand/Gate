import firestore from "@react-native-firebase/firestore";

/* ---------------- TYPES ---------------- */

export type LockSlotParams = {
  date: string;
  startTime: string;
  endTime: string;
  trainerId: string;
  clientId: string;
  clientGender: "male" | "female";
  clientIsHijabi: boolean;
  sessionId: string;
};

/* ---------------- HELPERS ---------------- */

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToDate(date: string, minutes: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setMinutes(minutes);
  return firestore.Timestamp.fromDate(d);
}

function generateTimeBuckets(date: string, start: number, end: number) {
  const buckets: string[] = [];
  for (let t = start; t < end; t += 5) {
    buckets.push(`${date}_${t}`);
  }
  return buckets;
}

/* ---------------- MAIN ---------------- */

export async function lockGymTimeSlot({
  sessionId,
  date,
  startTime,
  endTime,
  trainerId,
  clientId,
  clientGender,
  clientIsHijabi,
}: LockSlotParams) {
  const db = firestore();
  const slotsRef = db.collection("gym_time_slots");

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  if (newEnd <= newStart) {
    throw new Error("Invalid time range");
  }

  const bucketIds = generateTimeBuckets(date, newStart, newEnd);

  await db.runTransaction(async (tx) => {
    /* ---------- CHECK ALL BUCKETS ---------- */
    for (const bucketId of bucketIds) {
      const ref = slotsRef.doc(bucketId);
      const snap = await tx.get(ref);

      if (snap.exists()) {
        const s = snap.data();

        const existingType = s?.slotType;
        const newType =
          clientGender === "male"
            ? "male"
            : clientIsHijabi
            ? "female-hijabi"
            : "neutral";

        const privacyConflict =
          (newType === "male" && existingType === "female-hijabi") ||
          (newType === "female-hijabi" && existingType === "male");

        if (privacyConflict) {
          throw new Error(
            "Privacy conflict: a male and a hijabi client cannot overlap."
          );
        }

        throw new Error("Time overlap detected");
      }
    }
    const expiresAt = minutesToDate(date, newEnd);

    /* ---------- LOCK ALL BUCKETS ---------- */
    for (const bucketId of bucketIds) {
      tx.set(slotsRef.doc(bucketId), {
        sessionId,
        date,
        startMinutes: newStart,
        endMinutes: newEnd,
        slotType:
          clientGender === "male"
            ? "male"
            : clientIsHijabi
            ? "female-hijabi"
            : "neutral",
        trainerId,
        clientId,
        expiresAt,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}