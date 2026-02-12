import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";


export default function PostAuth() {
  const router = useRouter();

  const clearPushToken = async (uid: string) => {
    try {
  
      const clientSnap = await firestore()
        .collection("clients")
        .where("authUid", "==", uid)
        .limit(1)
        .get();
  
      if (!clientSnap.empty) {
        await clientSnap.docs[0].ref.update({
          pushToken: null,
        });
      }
    } catch (e) {
      console.log("⚠️ Failed to clear push token", e);
    }
  };

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
        router.replace("/client/Gate");
        return;
      }

      // ❌ Unknown user
      await clearPushToken(user.uid);
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
