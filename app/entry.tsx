import { View, Image, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export default function EntryScreen() {
  const routed = useRef(false);

  console.log("🟡 ENTRY: component rendered");

  useEffect(() => {
    console.log("🟡 ENTRY: waiting for auth state");

    const unsub = auth().onAuthStateChanged(async (user) => {
      if (routed.current) {
        console.log("🟡 ENTRY: already routed, skipping");
        return;
      }

      routed.current = true;

      try{
      if (!user) {
        console.log("🔵 ENTRY: user NOT signed in → route to / (index)");
        router.replace("/");
        return;
      }

      console.log("🟢 ENTRY: user signed in:", user.uid);

      const uid = user.uid;

      console.log("🟡 ENTRY: checking trainer document");
      const userDoc = await firestore().collection("users").doc(uid).get();

      if (userDoc.exists()) {
        console.log("🟢 ENTRY: trainer found → /trainer/dashboard");
        router.replace("/trainer/dashboard");
        return;
      }

      console.log("🟡 ENTRY: checking client document");
      const clientSnap = await firestore()
        .collection("clients")
        .where("authUid", "==", uid)
        .limit(1)
        .get();

      if (!clientSnap.empty) {
        console.log("🟢 ENTRY: client found → /client/Gate");
        router.replace("/client/Gate");
        return;
      }

      console.log("🔴 ENTRY: no role found → signing out");
      await auth().signOut();
      router.replace("/");
    }catch(err){
      console.error("ENTRY routing failed", err);
      await auth().signOut();
      router.replace("/");
    }
    });

    return unsub;
  }, []);

  console.log("🟡 ENTRY: rendering GATE LOGO loader");

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/gate-logo.png")}
        style={styles.logo}
        resizeMode="contain"
        onLoadStart={() => console.log("🟡 ENTRY: logo load start")}
        onLoadEnd={() => console.log("🟢 ENTRY: logo load end")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 160,
    height: 160,
  },
});