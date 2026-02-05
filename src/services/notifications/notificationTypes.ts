import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

export type NotificationType =
  | "session_reminder"
  | "preferred_time"
  | "announcement";

export type CreateNotificationParams = {
  clientId: string;

  type: NotificationType;

  title: string;
  body: string;

  // 🔗 navigation (optional but recommended)
  route?: string;
  params?: Record<string, any>;

  scheduledFor?: FirebaseFirestoreTypes.Timestamp;
  relatedSessionId?: string | null;
};
