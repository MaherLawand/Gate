import firestore from "@react-native-firebase/firestore";

export type CreateAnnouncementParams = {
  title?: string;
  authorId: string;
  text: string;
  imageUrl?: string | null;
};

export async function createAnnouncement({
  title,
  authorId,
  text,
  imageUrl,
}: CreateAnnouncementParams) {
  if (!text.trim() && !imageUrl) {
    throw new Error("Announcement must contain text or an image");
  }

  const doc = await firestore()
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

      // Optional expiry (can be null)
      expiresAt: null,
    });

  console.log("📢 Announcement created → Cloud Function will dispatch");

  return doc.id;
}
