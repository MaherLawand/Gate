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
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import fetch from "node-fetch";
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

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const PROJECT_ID = process.env.GCLOUD_PROJECT || "unknown";

const ENV =
  PROJECT_ID === "gateprivategym-951cf"
    ? "DEV"
    : PROJECT_ID === "gate-2056a"
      ? "PROD"
      : "UNKNOWN";

logger.info(`🚀 Cloud Functions booted`, {
  projectId: PROJECT_ID,
  environment: ENV,
});

function envLogPrefix() {
  return `[${ENV}]`;
}

export const dispatchScheduledNotifications = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Beirut",
    maxInstances: 1,
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    logger.info(`${envLogPrefix()} 🔔 [CF] Dispatch cycle started`, {
      now: now.toDate().toISOString(),
    });

    const clientsSnap = await db.collection("clients").get();

    for (const clientDoc of clientsSnap.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();

      const pushToken = clientData.pushToken;
      const notificationsEnabled = clientData.notificationsEnabled !== false;

      if (!pushToken || !notificationsEnabled) continue;

      const notificationsSnap = await db
        .collection("clients")
        .doc(clientId)
        .collection("notifications")
        .where("sent", "==", false)
        .where("scheduledFor", "<=", now)
        .get();

      if (notificationsSnap.empty) continue;

      logger.info(`${envLogPrefix()} 📦 [CF] Notifications found`, {
        clientId,
        count: notificationsSnap.size,
      });

      for (const notifDoc of notificationsSnap.docs) {
        const notif = notifDoc.data();
        logger.info(`${envLogPrefix()} 🔑 Push token check`, {
          clientId,
          pushToken,
        });
        const clientRef = notifDoc.ref.parent.parent; // clients/{clientId}
        const clientSnap = await clientRef?.get();

        logger.info(`${envLogPrefix()} 📨 [CF] Notification payload preview`, {
          clientId,
          notificationId: notifDoc.id,
          scheduledFor: notif.scheduledFor?.toMillis?.(),
          sent: notif.sent,
        });

        // ⏭️ Expiration handling (announcements never expire)
        const isExpired =
          notif.expiresAt && notif.expiresAt.toMillis() <= now.toMillis();

        if (isExpired && notif.type !== "announcement") {
          logger.info(
            `${envLogPrefix()} ⏭️ [CF] Skipping expired notification"`,
            {
              clientId,
              notificationId: notifDoc.id,
            },
          );

          await notifDoc.ref.update({
            sent: true,
            expired: true,
          });

          continue;
        }
const mode = clientData.notificationSettings?.mode ?? "sound";

const payload = {
  to: pushToken,
  title: notif.title,
  body: notif.body ?? "",
  sound: mode === "sound" ? "default" : null,
  priority: "high",
  channelId: mode, // 👈 KEY LINE
  data: {
    route: notif.route ?? null,
    params: notif.params ?? null,
  },
};
        try {
          const res = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify([payload]), // 👈 MUST be array
          });

          const result = (await res.json()) as ExpoPushResponse;

          // ❌ Request-level failure
          if (!res.ok) {
            logger.warn("Expo push request rejected", {
              clientId,
              notificationId: notifDoc.id,
              httpStatus: res.status,
              expoResponse: result,
            });
            continue;
          }

          // ❌ Missing ticket data
          if (!hasData(result)) {
            logger.warn(`${envLogPrefix()} Expo push response missing data`, {
              clientId,
              notificationId: notifDoc.id,
              expoResponse: result,
            });
            continue;
          }

          const expoResult = result.data[0];

          // ✅ Success
          if (expoResult.status === "ok") {
            await notifDoc.ref.update({ sent: true });
            logger.info(`${envLogPrefix()}✅ Expo push sent`, {
              clientId,
              notificationId: notifDoc.id,
            });
            continue;
          }

          // ❌ Ticket rejected
          // ❌ Ticket rejected
          logger.warn(`${envLogPrefix()} 🚨 Expo push ticket rejected`, {
            clientId,
            notificationId: notifDoc.id,
            status: expoResult.status,
            message: expoResult.message,
            details: expoResult.details,
          });

          // Optional: auto-clean dead tokens
          if (expoResult.details?.error === "DeviceNotRegistered") {
            await clientDoc.ref.update({
              pushToken: admin.firestore.FieldValue.delete(),
            });
          }
        } catch (err: any) {
          logger.error(`${envLogPrefix()}❌ [CF] Push failed`, {
            clientId,
            notificationId: notifDoc.id,
            error: err?.message,
            stack: err?.stack,
          });
        }
      }
    }

    logger.info(`${envLogPrefix()}🏁 [CF] Dispatch cycle finished`);
  },
);

type AnnouncementDoc = {
  title: string;
  body: string; // 👈 match frontend
  imageUrl?: string | null; // 👈 add this
  authorId: string;

  route?: string;
  params?: Record<string, any>;

  expiresAt?: admin.firestore.Timestamp | null;
};
function hasData(res: ExpoPushResponse): res is ExpoPushOkResponse {
  return "data" in res;
}
type ExpoPushResult = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: any;
};

type ExpoPushOkResponse = {
  data: ExpoPushTicket[];
};

type ExpoPushErrorResponse = {
  errors?: { code: string; message: string }[];
  error?: { code: string; message: string };
};

type ExpoPushResponse = ExpoPushOkResponse | ExpoPushErrorResponse;
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
export const onAnnouncementCreated = onDocumentCreated(
  "announcements/{announcementId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const announcement = snapshot.data() as AnnouncementDoc;
    const announcementId = event.params.announcementId;

    const clientsSnap = await db.collection("clients").get();
    const batch = db.batch();

    for (const clientDoc of clientsSnap.docs) {
      const client = clientDoc.data();
      const notificationsEnabled = client.notificationsEnabled !== false;

      const notifRef = db
        .collection("clients")
        .doc(clientDoc.id)
        .collection("notifications")
        .doc();

      batch.set(notifRef, {
        type: "announcement",
        title: announcement.title ?? "Announcement",
        body: announcement.body ?? "",
        imageUrl: announcement.imageUrl ?? null, // 👈 store image
        route: "/(app)/client/announcements",
        params: { announcementId },
        scheduledFor: admin.firestore.Timestamp.now(),
        expiresAt: announcement.expiresAt ?? null,
        sent: !notificationsEnabled,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    logger.info(`${envLogPrefix()}📣 Announcement enqueued`, {
      announcementId,
      count: clientsSnap.size,
    });
  },
);

export const scheduleWeeklyPreferencesReminder = onSchedule(
  {
    schedule: "0 9 * * 6", // Every Saturday at 09:00
    timeZone: "Asia/Beirut",
    maxInstances: 1,
  },
  async () => {
    logger.info(`${envLogPrefix()}🗓️ [CF] Weekly preferences reminder started`);

    // Get this week's Saturday key (local time safe)
    const now = new Date();
    const day = now.getDay(); // 0=Sun ... 6=Sat
    const diff = day === 6 ? 0 : -(day + 1);
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + diff);

    const weekKey = `${saturday.getFullYear()}-${String(
      saturday.getMonth() + 1,
    ).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`;

    const clientsSnap = await db.collection("clients").get();

    for (const clientDoc of clientsSnap.docs) {
      const client = clientDoc.data();

      const notificationsEnabled = client.notificationsEnabled !== false;
      const clientId = clientDoc.id;

      await db
        .collection("clients")
        .doc(clientId)
        .collection("notifications")
        .add({
          type: "weekly_preferences",
          title: "Set your training preferences",
          body: "Please choose your preferred training times for this week.",
          route: "/client/ClientWeeklyPreferencesScreen",
          params: { weekKey },
          scheduledFor: admin.firestore.Timestamp.now(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(saturday.getTime() + 6 * 24 * 60 * 60 * 1000),
          ), // expires Friday
          sent: !notificationsEnabled,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    logger.info(
      `${envLogPrefix()}✅ [CF] Weekly preferences notifications created`,
      {
        weekKey,
        count: clientsSnap.size,
      },
    );
  },
);

// firebase deploy --only functions
//! currently undeployed
