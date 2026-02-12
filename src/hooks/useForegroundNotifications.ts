import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import Toast from "react-native-toast-message";

export function useForegroundNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    Notifications.setNotificationHandler({
      handleNotification:
        async (): Promise<Notifications.NotificationBehavior> => ({
          shouldShowAlert: false, // legacy
          shouldShowBanner: false, // iOS banner
          shouldShowList: false, // iOS notification center
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
    });

    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body } = notification.request.content;

        try {
          Toast.show({
            type: "notification",
            text1: title ?? "New notification",
            text2: body ?? "",
            position: "top",
            visibilityTime: 4000,
          });
        } catch {
          // Toast not mounted yet (cold start)
        }
      }
    );

    return () => {
      sub.remove();
      initialized.current = false;
    };
  }, []);
}
