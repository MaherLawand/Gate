import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useEffect, useState } from "react";

export function useAuthReady() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    let mounted = true;

    const unsub = auth().onAuthStateChanged((u) => {
      if (!mounted) return;

      setUser(u ?? null);
      setReady(true); // auth resolved (login OR logout)
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { ready, user };
}
