import { Stack } from "expo-router";
import { View } from "react-native";
import Header from "@/src/components/AppHeader";

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
