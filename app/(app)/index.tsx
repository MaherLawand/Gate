import { useEffect } from "react";
import { router } from "expo-router";
import { auth } from "@/src/services/firebase";
import firestore from "@react-native-firebase/firestore";
import { doc, root } from "@/src/services/db"; // or correct relative path
import { getDoc } from "@/src/services/fireStoreHelpers";
import Constants from "expo-constants";
import { log, error } from "@/src/utils/logger";
import crashlytics from "@react-native-firebase/crashlytics";
const ENV =
  Constants.expoConfig?.extra?.variant ?? "prod";
const defaultHandler = ErrorUtils.getGlobalHandler?.();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  crashlytics().recordError(error);

  if (defaultHandler) {
    defaultHandler(error, isFatal);
  }
});
export default function AppIndex() {
 useEffect(() => {
  
  const checkUser = async () => {
    
    const user = auth().currentUser;

    log("ENV:", ENV);

    if (!user) {
      router.replace("/(auth)");
      return;
    }
crashlytics().setAttribute("env", ENV);
crashlytics().setUserId(auth().currentUser?.uid ?? "guest");
    try {
      const userDocRef = await doc("users", user.uid);

      // 🔥 listen instead of get (prevents race condition)
     const unsubscribe = userDocRef.onSnapshot(
  (snap :any) => {
    if (!snap || !snap.exists()) {
      log("⏳ Waiting for user document...");
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
    error("🔥 Firestore listener error:", error);
    unsubscribe();   // 🚨 stop infinite loop
    router.replace("/(auth)");
  }
);

    } catch (e) {
      log("Routing error:", e);
      router.replace("/(auth)");
    }
  };

  checkUser();
}, []);

  return null;
}