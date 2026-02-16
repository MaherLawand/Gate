globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

// export const unstable_settings = {
//   initialRouteName: "entry",
// };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter_18pt-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter_18pt-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter_18pt-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter_18pt-Bold.ttf"),
    "Sora-Medium": require("../assets/fonts/Sora-Medium.ttf"),
    "Sora-SemiBold": require("../assets/fonts/Sora-SemiBold.ttf"),
    "Sora-Bold": require("../assets/fonts/Sora-Bold.ttf"),
  });

  // 🔔 FOREGROUND PUSH HANDLER

  if (!fontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
    </>
  );
}
