import firestore from "@react-native-firebase/firestore";
import { root ,db} from "./db"; // ✅ add this
/* ---------------- TYPES ---------------- */

export type LockSlotParams = {
  date: string;                 // YYYY-MM-DD
  startTime: string;            // HH:mm
  endTime: string;              // HH:mm
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

function generateTimeBuckets(start: number, end: number) {
  const buckets: number[] = [];
  for (let t = start; t < end; t += 5) {
    buckets.push(t);
  }
  return buckets;
}

function resolveSlotType(
  gender: "male" | "female",
  isHijabi: boolean
): "male" | "female" | "female-hijabi" {
  if (gender === "male") return "male";
  if (isHijabi) return "female-hijabi";
  return "female";
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

  const slotsRef = root().collection("gym_time_slots"); // ✅ scoped

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw new Error("Invalid time range");
  }

  const buckets = generateTimeBuckets(startMinutes, endMinutes);
  const newSlotType = resolveSlotType(clientGender, clientIsHijabi);
  const expiresAt = minutesToDate(date, endMinutes);

  await db.runTransaction(async (tx) => {
    for (const minute of buckets) {
      const docId = `${date}_${minute}`;
      const ref = slotsRef.doc(docId);
      const snap = await tx.get(ref);
  
      const data = snap.exists() ? snap.data()! : {
        maleCount: 0,
        femaleHijabiCount: 0,
      };
  
      // 🚫 Privacy conflict
      if (
        (data.maleCount > 0 && clientIsHijabi) ||
        (data.femaleHijabiCount > 0 && clientGender === "male")
      ) {
        throw new Error(
          "Privacy conflict: male and hijabi sessions cannot overlap."
        );
      }
  
      // ✅ Safe → increment
      tx.set(
        ref,
        {
          maleCount:
            data.maleCount + (clientGender === "male" ? 1 : 0),
          femaleHijabiCount:
            data.femaleHijabiCount +
            (clientGender === "female" && clientIsHijabi ? 1 : 0),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  console.info("[SlotLock] SUCCESS", {
    sessionId,
    date,
    startTime,
    endTime,
  });
}