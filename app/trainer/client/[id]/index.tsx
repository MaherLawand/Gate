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
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<any>(null);

  // Fetch client info
  const fetchClient = async () => {
    if (!id) return;
    const clientSnap = await getDoc(doc("clients", id));
    if (clientSnap.exists()) setClient(clientSnap.data());
  };

  // Fetch notes
  const fetchNotes = async (clientId: string) => {
    if (!clientId) return [];
    try {
      const clientRef = doc("clients", clientId);
      const clientSnap = await getDoc(clientRef);

      if (!clientSnap.exists()) {
        throw new Error("Client not found");
      }

      const uid = auth().currentUser?.uid;

      if (!uid || clientSnap.data()?.trainerId !== uid) {
        throw new Error("Not authorized to view notes for this client");
      }

      const snapshot = await collection("clients", clientId, "notes")
        .orderBy("createdAt", "desc")
        .get();
      const notesArr: any[] = [];
      snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        notesArr.push({ id: doc.id, ...doc.data() });
      });

      setNotes(notesArr);
      return notesArr;
    } catch (error: any) {
      console.error("Error fetching notes:", error.message);
      return [];
    }
  };




  useEffect(() => {
    const loadData = async () => {
      await fetchClient();
      await fetchNotes(id!);
      setLoading(false);
    };
    loadData();
  }, [id]);



 

  // Add note
  const handleAddNote = async (clientId: string, content: string) => {
    if (!content) return;

    try {
      const clientRef = doc("clients", clientId);
      const clientSnap = await getDoc(clientRef);

      if (!clientSnap.exists()) throw new Error("Client not found");
      const uid = auth().currentUser?.uid;

      if (!uid || clientSnap.data()?.trainerId !== uid) {
        throw new Error("Not authorized to view notes for this client");
      }

      await addDoc(collection("clients", clientId, "notes"), {
        content,
        createdAt: serverTimestamp(),
      });

      setNewNote("");
      setModalVisible(false);
      await fetchNotes(clientId); // refresh notes
    } catch (error: any) {
      console.error("Error adding note:", error.message);
      alert(error.message);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    try {
      const noteRef = doc("clients", id, "notes", noteId);
      await deleteDoc(noteRef);
      console.log("Note deleted:", noteId);
      await fetchNotes(id); // refresh after deletion
    } catch (error: any) {
      console.error("Error deleting note:", error.message);
      alert(error.message);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!content) return;

    try {
      const noteRef = doc("clients", id!, "notes", noteId);

      await setDoc(
        noteRef,
        { content, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setEditingNote(null);
      fetchNotes(id!); // refresh list
    } catch (error: any) {
      console.error("Error updating note:", error.message);
      alert(error.message);
    }
  };

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
        <Text style={styles.sectionTitle}>Trainer Notes</Text>
        <AppButton
          title="View Sessions"
          onPress={() => router.push(`/trainer/client/${id}/sessions`)}
        />
        <AppButton title="+ Add Note" onPress={() => setModalVisible(true)} />

        

        {notes.length === 0 ? (
          <Text style={styles.noNotes}>No notes yet</Text>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.noteCard}>
                {/* Timestamp */}
                <Text style={styles.noteTimestamp}>
                  {item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleString()
                    : "Unknown date"}
                </Text>

                {/* Note content */}
                <Text style={styles.noteText}>{item.content}</Text>

                {/* Action buttons at the bottom-right */}
                <View style={styles.noteActions}>
                  <AppButton
                    title="Edit"
                    variant="small"
                    onPress={() => {
                      setEditingNote(item);
                      setNewNote(item.content);
                      setModalVisible(true);
                    }}
                  />

                  <AppButton
                    title="Delete"
                    variant="small"
                    onPress={() => handleDeleteNote(item.id)}
                  />
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Modal for adding note */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingNote(null);
          setNewNote("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Write a note..."
              placeholderTextColor={colors.textSecondary}
              value={newNote}
              onChangeText={setNewNote}
            />
            <AppButton
              title={editingNote ? "Update Note" : "Add Note"}
              onPress={() => {
                if (editingNote) {
                  handleUpdateNote(editingNote.id, newNote);
                } else {
                  handleAddNote(id!, newNote);
                }
                setNewNote("");
                setModalVisible(false);
              }}
            />
            <AppButton title="Cancel" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
      
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
  noNotes: { color: colors.textSecondary, marginTop: 8 },
  noteCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  noteDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  noteTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  noteText: { color: colors.textPrimary, marginBottom: 6 },
  deleteText: { color: colors.white, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 24,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-end",
  },
  deleteButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  noteTimestamp: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8, // space between Edit and Delete buttons
    marginTop: 12,
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
