import Header from "@/src/components/AppHeader";
import { ClientProvider } from "@/src/components/ClientContext";
import ClientFooter from "@/src/components/ClientFooter";
import { notificationToastConfig } from "@/src/components/notificationToast";
import { useForegroundNotifications } from "@/src/hooks/useForegroundNotifications";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("../../assets/fonts/Inter_18pt-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter_18pt-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter_18pt-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/Inter_18pt-Bold.ttf"),

    "Sora-Medium": require("../../assets/fonts/Sora-Medium.ttf"),
    "Sora-SemiBold": require("../../assets/fonts/Sora-SemiBold.ttf"),
    "Sora-Bold": require("../../assets/fonts/Sora-Bold.ttf"),
  });

  useForegroundNotifications();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "black" }} />;
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050608" }}>
      <ClientProvider>
        <Header />
        <Stack screenOptions={{ headerShown: false }} />
        <ClientFooter />
        <Toast config={notificationToastConfig} />
      </ClientProvider>
    </SafeAreaView>
  );
}
