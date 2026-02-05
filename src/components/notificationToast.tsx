import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BaseToast } from "react-native-toast-message";
import { colors } from "../theme/colors";

export const notificationToastConfig = {
  notification: (props: any) => {
    const insets = useSafeAreaInsets();

    return (
      <View
        style={{
          marginTop: insets.top + 30, // 👈 status bar + header height
          paddingHorizontal: 12,
        }}
      >
        <BaseToast
          {...props}
          style={{
            backgroundColor: colors.background,
            borderLeftColor: colors.primary,
            borderRadius: 16,
            elevation: 6,
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
          text1Style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "600",
          }}
          text2Style={{
            color: "#B3B9C9",
            fontSize: 13,
          }}
        />
      </View>
    );
  },
};
