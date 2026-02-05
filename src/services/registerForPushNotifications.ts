import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { Platform } from "react-native";

export async function registerForPushNotifications() {
  try {
    // 🔥 Lazy imports (important for Expo)
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (!Device.isDevice) {
      console.log("⚠️ Push notifications require a physical device");
      return;
    }

    // 1️⃣ Permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Push notification permission not granted");
      return;
    }

    // 2️⃣ Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: "5bc10cd6-e679-4eb4-a6d5-3bb4abc257d7",
    });
    const pushToken = tokenResponse.data;

    console.log("✅ Expo push token:", pushToken);

    // 3️⃣ Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("announcements", {
        name: "Announcements",
        importance: Notifications.AndroidImportance.HIGH, // 🔥 KEY
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    // 4️⃣ Save token to Firestore (trainer OR client)
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const usersRef = firestore().collection("users").doc(uid);
    const userSnap = await usersRef.get();

    // ✅ TRAINER
    if (userSnap.exists()) {
      await usersRef.set(
        {
          pushToken,
          pushTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Push token saved for TRAINER");
      return;
    }

    // ✅ CLIENT
    const clientSnap = await firestore()
      .collection("clients")
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

      console.log("✅ Push token saved for CLIENT");
      return;
    }

    console.log("⚠️ No user or client document found for push token");
  } catch (err) {
    console.error("🔥 registerForPushNotifications failed:", err);
  }
}