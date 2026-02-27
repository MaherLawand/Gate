import { useEffect } from "react";
import { router } from "expo-router";
import { auth } from "@/src/services/firebase";
import { doc, root } from "@/src/services/db";

export default function Index() {
  useEffect(() => {
    const routeUser = async () => {
      const user = auth().currentUser;

      if (!user) {
        router.replace("/(auth)");
        return;
      }

      try {
        // 🔵 Check trainer document
        const trainerSnap = await doc("users", user.uid).get();

        if (trainerSnap.exists()) {
          router.replace("/(app)/trainer/dashboard");
          return;
        }

        // 🟢 Check client collection
        const clientSnap = await root()
          .collection("clients")
          .where("authUid", "==", user.uid)
          .limit(1)
          .get();

        if (!clientSnap.empty) {
          router.replace("/(app)/client/Gate");
          return;
        }

        // ⚠️ No role found
        await auth().signOut();
        router.replace("/(auth)");
      } catch {
        await auth().signOut();
        router.replace("/(auth)");
      }
    };

    routeUser();
  }, []);

  return null;
}