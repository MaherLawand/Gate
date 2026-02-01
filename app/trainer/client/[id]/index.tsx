import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AppButton from "../../../../src/components/AppButton";

import { auth } from "../../../../src/services/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "../../../../src/services/fireStoreHelpers";
import { colors } from "../../../../src/theme/colors";


export default function ClientDetailsScreen() {
  const { id, expired } = useLocalSearchParams<{
    id: string;
    expired?: string;
  }>(); // dynamic client id
  const [client, setClient] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);



  // Fetch client info
  const fetchClient = async () => {
    if (!id) return;
    const clientSnap = await getDoc(doc("clients", id));
    if (clientSnap.exists()) setClient(clientSnap.data());
  };

  





  useEffect(() => {
    const loadData = async () => {
      await fetchClient();
      setLoading(false);
    };
    loadData();
  }, [id]);



 

  

  if (loading)
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textPrimary }}>Loading...</Text>
      </View>
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={styles.title}>
        {client?.firstName} {client?.lastName}
      </Text>

      

      <Text style={styles.label}>Phone:</Text>
      <Text style={styles.value}>{client?.phone || "N/A"}</Text>

      <Text style={styles.label}>Bio:</Text>
      <Text style={styles.value}>{client?.bio || "No bio yet"}</Text>

      <View style={{ marginTop: 24 }}>
       
        <AppButton
          title="View Sessions"
          onPress={() => router.push(`/trainer/client/${id}/sessions`)}
        />
        

        

        
      </View>

      
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  renewWarning: {
    color: "#ef4444",
    fontWeight: "700",
    marginBottom: 12,
  },
  label: { color: colors.textSecondary, fontWeight: "600" },
  value: { color: colors.textPrimary, marginBottom: 12 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
 
 
  unpaidHighlight: {
    borderWidth: 2,
    borderColor: "#f59e0b", // amber
    backgroundColor: "#1f1a10",
  },
  unpaidBadge: {
    color: "#f59e0b",
    fontWeight: "700",
    marginBottom: 6,
  },
});
