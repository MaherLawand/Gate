import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import firestore from "@react-native-firebase/firestore";
import dayjs from "dayjs";
import { CreateNotificationParams } from "./notificationTypes";
import {log,warn,error,info} from "@src/utils/logger"

/* =========================
   CREATE NOTIFICATION
========================= */

export async function createClientNotification({
  clientId,
  type,
  title,
  body,
  route,
  params,
  scheduledFor,
  relatedSessionId,
}: CreateNotificationParams) {
  const db = firestore();

  log("🟡 [Notification] Creating", {
    clientId,
    type,
    scheduledFor: scheduledFor?.toDate?.(),
    relatedSessionId,
  });

  const notificationsRef = db
    .collection("clients")
    .doc(clientId)
    .collection("notifications");

  const createdAt = firestore.Timestamp.now();
  const baseTime = scheduledFor ?? createdAt;

  const expiresAt = firestore.Timestamp.fromDate(
    dayjs(baseTime.toDate()).add(1, "hour").toDate()
  );

  await notificationsRef.add({
    type,
    title,
    body,

    route,
    params: params ?? null,

    relatedSessionId: relatedSessionId ?? null,
    scheduledFor: scheduledFor ?? null,

    read: false,
    sent: false,

    createdAt,
    expiresAt,
  });

  log("🟢 [Notification] Created successfully", {
    clientId,
    type,
    expiresAt: expiresAt.toDate(),
  });
}

/* =========================
   TYPES
========================= */

export type ClientNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  route?: string;
  params?: Record<string, any> | null;
  relatedSessionId?: string | null;
  scheduledFor?: FirebaseFirestoreTypes.Timestamp | null;
  read: boolean;
  sent: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  expiresAt: FirebaseFirestoreTypes.Timestamp;
};

/* =========================
   UNREAD COUNT LISTENER
========================= */

export function listenUnreadNotificationsCount(
  clientId: string,
  onChange: (count: number) => void
) {
  log("🔵 [Notifications] Subscribing unread count", { clientId });

  return firestore()
    .collection("clients")
    .doc(clientId)
    .collection("notifications")
    .where("read", "==", false)
    .where("sent", "==", true)
    .where("expiresAt", ">", firestore.Timestamp.now())
    .onSnapshot(
      (snap) => {
        if (!snap) {
          warn("⚠️ [Notifications] unread count snapshot null");
          onChange(0);
          return;
        }

        log("🔔 [Notifications] Unread count updated", {
          clientId,
          count: snap.size,
        });

        onChange(snap.size);
      },
      (error) => {
        warn("❌ [Notifications] unread count listener error", error);
        onChange(0);
      }
    );
}

/* =========================
   NOTIFICATION LIST LISTENER
========================= */

export function listenClientNotifications(
  clientId: string,
  onChange: (items: ClientNotification[]) => void
) {
  log("🔵 [Notifications] Subscribing list", { clientId });

  return firestore()
    .collection("clients")
    .doc(clientId)
    .collection("notifications")
    .where("expiresAt", ">", firestore.Timestamp.now())
    .orderBy("expiresAt")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snap) => {
        if (!snap) {
          warn("⚠️ [Notifications] list snapshot null");
          onChange([]);
          return;
        }

        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ClientNotification, "id">),
        }));

        log("📥 [Notifications] List updated", {
          clientId,
          count: items.length,
        });

        onChange(items);
      },
      (error) => {
        warn("❌ [Notifications] list listener error", error);
        onChange([]);
      }
    );
}
