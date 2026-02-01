import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { Platform } from "react-native";

export async function registerForPushNotifications() {
  try {
    // 🔥 Lazy imports (required)
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    // ✅ CORRECT access
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
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenResponse.data;

    console.log("✅ Expo push token:", pushToken);

    // 3️⃣ Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // 4️⃣ Save token to Firestore
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    await firestore().collection("users").doc(uid).set(
      {
        pushToken,
        pushTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ Push token saved to Firestore");
  } catch (err) {
    console.error("🔥 registerForPushNotifications failed:", err);
  }
}
