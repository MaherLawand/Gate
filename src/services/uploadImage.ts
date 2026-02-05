import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { Platform } from "react-native";
type ImageType = "avatar" | "cover" | "announcement";

export async function uploadImage(
  localUri: string,
  type: "avatar" | "cover" | "announcement"
) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  let path = "";
  if (type === "avatar") path = `profilePictures/${uid}/avatar.jpg`;
  if (type === "cover") path = `profilePictures/${uid}/cover.jpg`;
  if (type === "announcement") path = `announcements/${uid}/${Date.now()}.jpg`;

  const fileRef = storage().ref(path);

  await fileRef.putFile(
    Platform.OS === "android" ? localUri : localUri.replace("file://", "")
  );

  return await fileRef.getDownloadURL();
}

export async function uploadBugImage(localUri: string) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const path = `bugs/${uid}/${Date.now()}.jpg`;
  const fileRef = storage().ref(path);

  await fileRef.putFile(
    Platform.OS === "android" ? localUri : localUri.replace("file://", "")
  );

  return await fileRef.getDownloadURL();
}
