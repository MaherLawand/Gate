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
  console.info("[SlotLock] START", {
    sessionId,
    date,
    startTime,
    endTime,
    trainerId,
    clientId,
    clientGender,
    clientIsHijabi,
  });

  const db = firestore();
  const slotsRef = db.collection("gym_time_slots");

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  if (newEnd <= newStart) {
    console.error("[SlotLock] Invalid time range", {
      start: newStart,
      end: newEnd,
    });
    throw new Error("Invalid time range");
  }

  const bucketIds = generateTimeBuckets(date, newStart, newEnd);

  console.info("[SlotLock] Generated buckets", {
    count: bucketIds.length,
    buckets: bucketIds,
  });

  await db.runTransaction(async (tx) => {
    /* ---------- CHECK ALL BUCKETS ---------- */

    console.info("[SlotLock:transaction] Checking buckets");

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
            : "female";
      
        const privacyConflict =
          (existingType === "male" && newType === "female-hijabi") ||
          (existingType === "female-hijabi" && newType === "male");
      
        if (privacyConflict) {
          console.error("[SlotLock] Privacy conflict detected", {
            bucketId,
            existingType,
            newType,
          });
      
          throw new Error(
            "Privacy conflict: a male and a hijabi client cannot overlap."
          );
        }
      
        // ✅ OTHERWISE: overlap is allowed → DO NOTHING
      }
    }

    const expiresAt = minutesToDate(date, newEnd);

    /* ---------- LOCK ALL BUCKETS ---------- */

    console.info("[SlotLock:transaction] Locking buckets", {
      bucketCount: bucketIds.length,
      expiresAt,
    });

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

  console.info("[SlotLock] SUCCESS", {
    sessionId,
    date,
    startTime,
    endTime,
  });
}