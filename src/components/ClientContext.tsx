import { createContext, useContext, useEffect, useState } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

type ClientContextType = {
  clientId: string | null;
  trainerId: string | null;
  clientloading: boolean;
};

const ClientContext = createContext<ClientContextType | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [clientloading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    const loadClient = async () => {
      const snap = await firestore()
        .collection("clients")
        .where("authUid", "==", user.uid)
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        setClientId(doc.id);
        setTrainerId(doc.data().trainerId);
      }

      setLoading(false);
    };

    loadClient();
  }, []);

  return (
    <ClientContext.Provider value={{ clientId, trainerId, clientloading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error("useClient must be used inside ClientProvider");
  }
  return ctx;
}