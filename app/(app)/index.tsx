import { useEffect } from "react";
import { router } from "expo-router";
import { auth } from "@/src/services/firebase";
import firestore from "@react-native-firebase/firestore";

export default function AppIndex() {
  useEffect(() => {
    const checkUser = async () => {
      const user = auth().currentUser;

      if (!user) {
        router.replace("/(auth)");
        return;
      }

      try {
        // 🔥 Only check USERS collection
        const trainerDoc = await firestore()
          .collection("users")
          .doc(user.uid)
          .get();

        if (trainerDoc.exists() && trainerDoc.data()?.role === "trainer") {
          router.replace("/(app)/trainer/dashboard");
          return;
        }

        // If no role → client
        router.replace("/(app)/client/Gate");

      } catch (e) {
        console.log("Routing error:", e);
        router.replace("/(auth)");
      }
    };

    checkUser();
  }, []);

  return null;
}