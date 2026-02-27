import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let initialized = false;

export async function setupNotifications() {
  if (initialized) return;
  initialized = true;

  if (Platform.OS === "web") return;

  /* ---------------- ANDROID CHANNEL ---------------- */
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("sound", {
    name: "Sound Notifications",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync("vibrate", {
    name: "Vibrate Only",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
  });

  await Notifications.setNotificationChannelAsync("silent", {
    name: "Silent",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
}

  /* ---------------- FOREGROUND BEHAVIOR ---------------- */
  Notifications.setNotificationHandler({
    handleNotification:
      async (): Promise<Notifications.NotificationBehavior> => ({
        shouldShowAlert: false, // legacy (required by typings)
        shouldShowBanner: false, // iOS banner
        shouldShowList: false, // iOS notification center
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });
}
