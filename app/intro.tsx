import { firestore } from "@/src/services/firebase";
import auth from "@react-native-firebase/auth";
import { ResizeMode, Video } from "expo-av";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { withSequence } from "react-native-reanimated";

export default function IntroScreen() {
  const [issignedin, setIsSignedIn] = useState(true);
  const videoRef = useRef<Video>(null);
  const routedRef = useRef(false);

  useEffect(() => {
    const user = auth().currentUser;

    // ✅ Signed IN → skip intro completely
    if (user) {
      routeUser();
      setIsSignedIn(true);
    }
  }, []);

  const routeUser = async () => {
    if (routedRef.current) return;
    routedRef.current = true;

    const user = auth().currentUser;

    // ❌ Signed OUT → go to login (after video)
    if (!user) {
        console.log("giitoo")
      setIsSignedIn(false);
      router.replace("/");
      return;
    }

    const uid = user.uid;

    const userDoc = await firestore().collection("users").doc(uid).get();
    if (userDoc.exists()) {
      router.replace("/trainer/dashboard");
      return;
    }

    const clientSnap = await firestore()
      .collection("clients")
      .where("authUid", "==", uid)
      .limit(1)
      .get();

    if (!clientSnap.empty) {
      router.replace("/client/Gate");
      return;
    }

    await auth().signOut();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      {!issignedin && (
        <Video
          ref={videoRef}
          source={require("../assets/images/Final_Gate_animation.mp4")}
          resizeMode={ResizeMode.COVER}
          style={StyleSheet.absoluteFill}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;

            // 🎬 Video ends → route signed-out user
            if (status.didJustFinish) {
              routeUser();
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
});
