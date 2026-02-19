import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { Platform } from "react-native";
import { collection } from "./fireStoreHelpers"; // 👈 IMPORTANT
import {log,warn,error,info} from "../utils/logger"

export async function registerForPushNotifications() {
  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (!Device.isDevice) {
      log("⚠️ Push notifications require a physical device");
      return;
    }

    /* ================= PERMISSIONS ================= */

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      log("❌ Push notification permission not granted");
      return;
    }

    /* ================= GET TOKEN ================= */

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: "5bc10cd6-e679-4eb4-a6d5-3bb4abc257d7",
    });

    const pushToken = tokenResponse.data;

    log("✅ Expo push token:", pushToken);

    /* ================= ANDROID CHANNEL ================= */

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("announcements", {
        name: "Announcements",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    /* ================= SAVE TOKEN ================= */

    const uid = auth().currentUser?.uid;
    if (!uid) return;

    // 🔵 TRAINER
    const trainerSnap = await collection("users").doc(uid).get();

    if (trainerSnap.exists) {
      await trainerSnap.ref.set(
        {
          pushToken,
          pushTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      log("✅ Push token saved for TRAINER");
      return;
    }

    // 🟢 CLIENT
    const clientSnap = await collection("clients")
      .where("authUid", "==", uid)
      .limit(1)
      .get();

    if (!clientSnap.empty) {
      await clientSnap.docs[0].ref.set(
        {
          pushToken,
          pushTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      log("✅ Push token saved for CLIENT");
      return;
    }

    log("⚠️ No user or client document found for push token");
  } catch (err) {
    error("🔥 registerForPushNotifications failed:", err);
  }
}