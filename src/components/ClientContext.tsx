import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";

type ClientContextType = {
  clientId: string | null;
  trainerId: string | null;
  clientloading: boolean;
};

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [clientloading, setClientLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsub = auth().onAuthStateChanged(async (user) => {
      if (!mounted) return;

      // Reset state on logout
      if (!user) {
        setClientId(null);
        setTrainerId(null);
        setClientLoading(false);
        return;
      }

      try {
        setClientLoading(true);

        const snap = await firestore()
          .collection("clients")
          .where("authUid", "==", user.uid)
          .limit(1)
          .get();

        if (!mounted) return;

        if (!snap.empty) {
          const doc = snap.docs[0];
          setClientId(doc.id);
          setTrainerId(doc.data().trainerId ?? null);
        } else {
          // User is authenticated but NOT a client
          setClientId(null);
          setTrainerId(null);
        }
      } catch (err) {
        console.error("[ClientProvider] Failed to load client", err);
        setClientId(null);
        setTrainerId(null);
      } finally {
        if (mounted) setClientLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return (
    <ClientContext.Provider value={{ clientId, trainerId, clientloading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  return useContext(ClientContext);
}
