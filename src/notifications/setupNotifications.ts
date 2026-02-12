import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let initialized = false;

export async function setupNotifications() {
  if (initialized) return;
  initialized = true;

  if (Platform.OS === "web") return;

  /* ---------------- ANDROID CHANNEL ---------------- */
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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
