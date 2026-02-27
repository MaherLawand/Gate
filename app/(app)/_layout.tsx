import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { auth } from "@/src/services/firebase";
import { View } from "react-native";
import { colors } from "@/src/theme/colors";

export default function AppLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/(auth)");
      }
      setChecking(false);
    });

    return unsub;
  }, []);

  if (checking) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}