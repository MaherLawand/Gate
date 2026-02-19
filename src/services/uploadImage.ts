import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { Platform } from "react-native";
import { ENV } from "../config/env";

export async function uploadImage(
  localUri: string,
  type: "avatar" | "cover" | "announcement"
) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  let path = "";
if (type === "avatar")
  path = `${ENV}/profilePictures/${uid}/avatar.jpg`;

if (type === "cover")
  path = `${ENV}/profilePictures/${uid}/cover.jpg`;

if (type === "announcement")
  path = `${ENV}/announcements/${uid}/${Date.now()}.jpg`;

  const fileRef = storage().ref(path);

  await fileRef.putFile(
    Platform.OS === "android" ? localUri : localUri.replace("file://", "")
  );

  return await fileRef.getDownloadURL();
}

export async function uploadBugImage(localUri: string) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const path = `${ENV}/bugs/${uid}/${Date.now()}.jpg`;
  const fileRef = storage().ref(path);

  await fileRef.putFile(
    Platform.OS === "android" ? localUri : localUri.replace("file://", "")
  );

  return await fileRef.getDownloadURL();
}
