import { useEffect } from "react";
import { router } from "expo-router";
import { auth } from "@/src/services/firebase";
import firestore from "@react-native-firebase/firestore";
import { doc, root } from "@/src/services/db"; // or correct relative path
import { getDoc } from "@/src/services/fireStoreHelpers";
import Constants from "expo-constants";

const ENV =
  Constants.expoConfig?.extra?.variant ?? "prod";

export default function AppIndex() {
 useEffect(() => {
  
  const checkUser = async () => {
    
    const user = auth().currentUser;

    console.log("ENV:", ENV);

    if (!user) {
      router.replace("/(auth)");
      return;
    }

    try {
      const userDocRef = await doc("users", user.uid);

      // 🔥 listen instead of get (prevents race condition)
     const unsubscribe = userDocRef.onSnapshot(
  (snap :any) => {
    if (!snap || !snap.exists()) {
      console.log("⏳ Waiting for user document...");
      return;
    }

    const role = snap.data()?.role;

    if (role === "trainer") {
      router.replace("/(app)/trainer/dashboard");
    } else if (role === "client") {
      router.replace("/(app)/client/Gate");
    } else {
      router.replace("/(auth)");
    }

    unsubscribe();
  },
  (error: any) => {
    console.error("🔥 Firestore listener error:", error);
    unsubscribe();   // 🚨 stop infinite loop
    router.replace("/(auth)");
  }
);

    } catch (e) {
      console.log("Routing error:", e);
      router.replace("/(auth)");
    }
  };

  checkUser();
}, []);

  return null;
}