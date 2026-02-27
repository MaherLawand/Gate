import Header from "@/src/components/AppHeader";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import TrainerFooter from "@/src/components/TrainerFooter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function TrainerLayout() {
  return (
    
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#050608" }}
        edges={["top", "bottom"]}
      >
        <Header />
        <Stack screenOptions={{ headerShown: false,    headerBackButtonMenuEnabled: false,
 }} />
        <TrainerFooter />
      </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
    
  );
}

//check this out later