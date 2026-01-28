import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { Platform } from "react-native";

export async function uploadProfilePicture(localUri: string) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  // 🔹 Always upload to a deterministic path
  const fileRef = storage().ref(`profilePictures/${uid}/avatar.jpg`);

  // 🔹 IMPORTANT: wait for upload to finish
  await fileRef.putFile(
    Platform.OS === "android" ? localUri : localUri.replace("file://", "")
  );

  // 🔹 Only NOW the object exists
  const downloadURL = await fileRef.getDownloadURL();

  return downloadURL;
}
