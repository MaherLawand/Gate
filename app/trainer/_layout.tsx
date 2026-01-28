import Header from "@/src/components/AppHeader";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Alert, BackHandler, View } from "react-native";
import TrainerFooter from "../../src/components/TrainerFooter";

export default function TrainerLayout() {
 

  return (
    <View style={{ flex: 1, backgroundColor: "#050608" }}>
      <Header />
      <Stack screenOptions={{ headerShown: false }} />
      <TrainerFooter />
    </View>
  );
}
