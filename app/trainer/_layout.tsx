import Header from "@/src/components/AppHeader";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import TrainerFooter from "../../src/components/TrainerFooter";

export default function TrainerLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050608" }}>
      <Header />
      <Stack screenOptions={{ headerShown: false }} />
      <TrainerFooter />
    </SafeAreaView>
  );
}
