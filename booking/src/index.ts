/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

/* 🔴 ADD THIS — SIMPLE PING FUNCTION */
export const ping = onCall(() => {
  console.log("PING HIT");
  return { ok: true };
});

export const bookSession = onCall(async (request) => {
  console.log("🚀 FUNCTION ENTERED");
  logger.info("🔥 FUNCTION HIT");
  const auth = request.auth;
  const data = request.data;

  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  console.log("✅ AUTH OK", auth.uid);

  const {
    trainerId,
    clientId,
    clientGender,
    clientIsHijabi,
    date,
    startTime,
    endTime,
  } = data;
  console.log("📦 DATA OK");

  if (
    !trainerId ||
    !clientId ||
    !clientGender ||
    !date ||
    !startTime ||
    !endTime
  ) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  if (auth.uid !== trainerId) {
    throw new HttpsError("permission-denied", "Not your schedule.");
  }
  console.log("👤 TRAINER OK");

  logger.info("📅 Booking attempt", {
    trainerId,
    clientId,
    date,
    startTime,
    endTime,
  });

  // ---------- TIME HELPERS ----------
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);

  if (newEnd <= newStart) {
    throw new HttpsError("invalid-argument", "Invalid time range.");
  }

  // ---------- BLOCK PAST BOOKINGS ----------
  const now = new Date();
  const bookingDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (bookingDate < today) {
    throw new HttpsError(
      "failed-precondition",
      "You cannot book sessions in the past."
    );
  }

  if (bookingDate.getTime() === today.getTime()) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (newStart <= nowMinutes) {
      throw new HttpsError(
        "failed-precondition",
        "You cannot book sessions in the past."
      );
    }
  }

  // 🔎 ENSURE CLIENT EXISTS (CRITICAL FOR EMULATOR)
  const clientRef = db.collection("clients").doc(clientId);
  const clientSnap = await clientRef.get();

  console.log("👤 CLIENT EXISTS:", clientSnap.exists);

  if (!clientSnap.exists) {
    throw new HttpsError("not-found", "Client does not exist");
  }

  // ---------- ACTIVE PACKAGE ----------
  const packageSnap = await clientRef
    .collection("packages")
    .where("status", "==", "active")
    .where("sessionsRemaining", ">", 0)
    .limit(1)
    .get();

  console.log("📦 AFTER PACKAGE QUERY");

  if (packageSnap.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Client has no active package."
    );
  }

  const clientPackageId = packageSnap.docs[0].id;

  // ---------- SESSION ID ----------
  const sessionId = db.collection("_").doc().id;

  // ---------- SLOT LOCK (GLOBAL) ----------
  const slotsRef = db.collection("gym_time_slots");
  const slotSnap = await slotsRef.where("date", "==", date).get();

  await db.runTransaction(async (tx) => {
    for (const doc of slotSnap.docs) {
      const s = doc.data();

      const overlap = newStart < s.endMinutes && newEnd > s.startMinutes;

      if (!overlap) continue;

      const existingType = s.slotType;
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
        throw new HttpsError(
          "failed-precondition",
          "Privacy conflict: male and hijabi clients cannot overlap."
        );
      }
    }

    tx.set(slotsRef.doc(sessionId), {
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const sessionRef = db
      .collection("trainer_schedules")
      .doc(trainerId)
      .collection("days")
      .doc(date)
      .collection("sessions")
      .doc(sessionId);

    tx.set(sessionRef, {
      clientId,
      clientPackageId,
      date,
      startTime,
      endTime,
      clientGender,
      isHijabi: clientIsHijabi ?? false,
      attendance: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  logger.info("✅ Booking successful", { sessionId });
  return { success: true, sessionId };
});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
