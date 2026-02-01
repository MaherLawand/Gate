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

  // 1️⃣ Save announcement
  await firestore().collection("announcements").add({
    title: title?.trim() || null,
    authorId, // ✅ KEEP THIS
    text: text.trim(),
    imageUrl: imageUrl ?? null,
    active: true,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2️⃣ Trigger push notification
  await fetch("http://YOUR_LOCAL_IP:3000/send-announcement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title || "New announcement",
      body: text,
    }),
  });
}