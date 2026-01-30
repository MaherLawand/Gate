import ClientFooter from "@/src/components/ClientFooter";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import {ClientProvider} from "@/src/components/ClientContext";
export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <ClientProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ClientFooter />
      </ClientProvider>
    </View>
  );
}
