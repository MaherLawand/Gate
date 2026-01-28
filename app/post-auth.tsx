import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function PostAuth() {
  const router = useRouter();

  useEffect(() => {
    const resolveUser = async () => {
      const user = auth().currentUser;

      if (!user) {
        router.replace("/");
        return;
      }

      // 🔍 Trainer?
      const trainerSnap = await firestore()
        .collection("users")
        .doc(user.uid)
        .get();

      if (trainerSnap.exists()) {
        router.replace("/trainer/dashboard");
        return;
      }

      // 🔍 Client?
      const clientSnap = await firestore()
        .collection("clients")
        .where("authUid", "==", user.uid)
        .limit(1)
        .get();

      if (!clientSnap.empty) {
        router.replace("/client/home");
        return;
      }

      // ❌ Unknown user
      await auth().signOut();
      router.replace("/");
    };

    resolveUser();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
