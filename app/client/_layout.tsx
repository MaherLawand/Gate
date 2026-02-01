import { ClientProvider } from "@/src/components/ClientContext";
import ClientFooter from "@/src/components/ClientFooter";
import { Stack } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050608" }}>
      <ClientProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ClientFooter />
      </ClientProvider>
    </SafeAreaView>
  );
}
