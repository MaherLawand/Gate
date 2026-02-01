// app/_layout.tsx
import { ResizeMode, Video } from "expo-av";
import { Stack } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function RootLayout() {
  const videoRef = useRef<Video>(null);
  const [ready, setReady] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {!ready && (
        <Video
          ref={videoRef}
          source={require("../assets/images/Final_Gate_animation.mp4")}
          resizeMode={ResizeMode.COVER} // ✅ FIX
          style={StyleSheet.absoluteFill}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              setReady(true);
            }
          }}
        />
      )}

      {ready && (
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      )}
    </View>
  );
}
