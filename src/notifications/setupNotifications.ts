import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let initialized = false;

export async function setupNotifications() {
  if (initialized) return;
  initialized = true;

  if (Platform.OS === "web") return;

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
}
