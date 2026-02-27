import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { root } from "./db";
import { log, error } from "@/src/utils/logger";

type CreateAnnouncementParams = {
  title: string;
  authorId: string;
  text: string;
  imageUrl?: string | null;
  expiresAt?: FirebaseFirestoreTypes.Timestamp | null; // 👈 ADD THIS
};

export async function createAnnouncement({
  title,
  authorId,
  text,
  imageUrl,
  expiresAt,
}: CreateAnnouncementParams) {
  if (!text.trim() && !imageUrl) {
    throw new Error("Announcement must contain text or an image");
  }

  const doc = await root()
    .collection("announcements")
    .add({
      title: title ?? null,
      body: text.trim(), // 🔑 IMPORTANT: must match CF field
      authorId,
      imageUrl: imageUrl ?? null,

      // Optional routing
      route: "/announcements",
      params: null,

      createdAt: firestore.FieldValue.serverTimestamp(),
    expiresAt: expiresAt ?? null, // 👈 ADD THIS,
    });

  log("📢 Announcement created → Cloud Function will dispatch");

  return doc.id;
}
