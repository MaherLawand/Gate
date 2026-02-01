import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { Platform } from "react-native";

export async function uploadProfilePicture(localUri: string) {
  console.info("[ProfilePicture] Upload started");

  const uid = auth().currentUser?.uid;
  if (!uid) {
    console.error("[ProfilePicture] Not authenticated");
    throw new Error("Not authenticated");
  }

  console.info("[ProfilePicture] Authenticated user", { uid });

  // 🔹 Always upload to a deterministic path
  const fileRef = storage().ref(`profilePictures/${uid}/avatar.jpg`);

  console.info("[ProfilePicture] Uploading file", {
    path: `profilePictures/${uid}/avatar.jpg`,
    platform: Platform.OS,
  });

  // 🔹 IMPORTANT: wait for upload to finish
  await fileRef.putFile(
    Platform.OS === "android" ? localUri : localUri.replace("file://", "")
  );

  console.info("[ProfilePicture] Upload completed");

  // 🔹 Only NOW the object exists
  const downloadURL = await fileRef.getDownloadURL();

  console.info("[ProfilePicture] Download URL retrieved", {
    hasUrl: !!downloadURL,
  });

  return downloadURL;
}