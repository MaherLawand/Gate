import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import Toast from "react-native-toast-message";

export function useForegroundNotifications() {
  useEffect(() => {
    const sub =
      Notifications.addNotificationReceivedListener(notification => {
        const { title, body } = notification.request.content;

        Toast.show({
          type: "notification",
          text1: title ?? "New notification",
          text2: body ?? "",
          position: "top",
          visibilityTime: 4000,
        });
      });

    return () => sub.remove();
  }, []);
}