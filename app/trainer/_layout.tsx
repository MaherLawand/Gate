import Header from "@/src/components/AppHeader";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import TrainerFooter from "../../src/components/TrainerFooter";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function TrainerLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050608" }}>
      <GestureHandlerRootView>
        <Header />
        <Stack screenOptions={{ headerShown: false }} />
        <TrainerFooter />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
