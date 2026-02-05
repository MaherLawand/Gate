import AnimatedAppear from "@/src/components/AnimatedAppear";
import AppButton from "@/src/components/AppButton";
import { colors } from "@/src/theme/colors";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ActionSheet, {
  ActionSheetRef,
  ScrollView as SheetScrollView,
} from "react-native-actions-sheet";

import NoteSkeleton from "@/src/components/skeletons/Notes/NoteSkeleton";
import { typography } from "@/src/theme/typography";
import auth from "@react-native-firebase/auth";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

/* ------------------ PAGE ------------------ */

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sheetRef = useRef<ActionSheetRef>(null);
  const pendingClose = useRef(false);
  /* ------------------ STATE ------------------ */
  const allowCloseRef = useRef(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [originalNote, setOriginalNote] = useState("");
  const [editingNote, setEditingNote] = useState<any>(null);

  const hasChanges = newNote.trim() !== originalNote.trim();
  const [loading, setLoading] = useState(true);
  const hasUnsavedChanges = newNote.trim() !== originalNote.trim();
  /* ------------------ EFFECT ------------------ */

  useEffect(() => {
    if (id) fetchNotes(id);
  }, [id]);

  const resetNoteState = () => {
    setEditingNote(null);
    setNewNote("");
    setOriginalNote("");
  };

  const forceCloseSheet = () => {
    resetNoteState();
    sheetRef.current?.hide();
  };

  const attemptCloseSheet = () => {
    if (!hasUnsavedChanges) {
      forceCloseSheet();
      return;
    }

    Alert.alert(
      "Discard changes?",
      "If you leave now, your changes will be lost.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: forceCloseSheet,
        },
      ]
    );
  };

  const showDiscardAlert = () => {
    Alert.alert(
      "Discard changes?",
      "If you leave now, your changes will be lost.",
      [
        {
          text: "Stay",
          style: "cancel",
          onPress: () => {
            pendingClose.current = false;

            // 🔑 Reopen and restore edited state
            requestAnimationFrame(() => {
              sheetRef.current?.show();
              setNewNote((prev) => prev); // forces rebind
            });
          },
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            pendingClose.current = false;

            // 🔑 Restore original state
            setNewNote(originalNote);

            sheetRef.current?.hide();
          },
        },
      ]
    );
  };

  /* ------------------ FETCH NOTES ------------------ */

  const fetchNotes = async (clientId: string) => {
    try {
      setLoading(true);

      const clientRef = firestore().doc(`clients/${clientId}`);
      const clientSnap = await clientRef.get();

      if (!clientSnap.exists) throw new Error("Client not found");

      const uid = auth().currentUser?.uid;
      if (!uid || clientSnap.data()?.trainerId !== uid) {
        throw new Error("Not authorized");
      }

      const snapshot = await firestore()
        .collection("clients")
        .doc(clientId)
        .collection("notes")
        .orderBy("createdAt", "desc")
        .get();

      const arr: any[] = [];
      snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        arr.push({ id: doc.id, ...doc.data() });
      });

      setNotes(arr);
    } catch (e) {
      console.error("Error fetching notes:", e);
    } finally {
      setTimeout(() => setLoading(false), 400);
    }
  };

  /* ------------------ ADD NOTE ------------------ */

  const handleAddNote = async (content: string) => {
    if (!content || !id) return;

    try {
      await firestore().collection("clients").doc(id).collection("notes").add({
        content,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      allowCloseRef.current = true; // ✅ allow close
      resetNoteState(); // ✅ neutralize dirty state
      sheetRef.current?.hide();
      fetchNotes(id);
    } catch (e) {
      console.error("Error adding note:", e);
    }
  };

  /* ------------------ UPDATE NOTE ------------------ */

  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!content || !id) return;

    try {
      await firestore()
        .collection("clients")
        .doc(id)
        .collection("notes")
        .doc(noteId)
        .set(
          {
            content,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      allowCloseRef.current = true; // ✅ allow close
      resetNoteState(); // ✅ clean first
      sheetRef.current?.hide();
      fetchNotes(id);
    } catch (e) {
      console.error("Error updating note:", e);
    }
  };

  /* ------------------ DELETE NOTE ------------------ */

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;

    try {
      await firestore()
        .collection("clients")
        .doc(id)
        .collection("notes")
        .doc(noteId)
        .delete();

      setEditingNote(null);
      sheetRef.current?.hide();
      fetchNotes(id);
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  /* ------------------ RENDER ------------------ */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={[typography.heading, styles.title]}>Trainer Notes</Text>

      <AppButton
        title="+ Add Note"
        disabled={loading}
        onPress={() => {
          setEditingNote(null);
          setNewNote("");
          setOriginalNote("");
          sheetRef.current?.show();
        }}
      />

      {loading ? (
        <NoteSkeleton count={1} />
      ) : notes.length === 0 ? (
        <Text style={[typography.bodyMedium, styles.noNotes]}>
          No notes yet
        </Text>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ marginTop: 16 }}
          renderItem={({ item, index }) => (
            <AnimatedAppear delay={index * 60}>
              <View style={styles.noteCard}>
                {/* Header row */}
                <View style={styles.noteHeader}>
                  <Text style={[typography.small, styles.noteTimestamp]}>
                    {item.createdAt?.toDate
                      ? item.createdAt.toDate().toLocaleString()
                      : "—"}
                  </Text>

                  <View style={styles.noteActions}>
                    {/* EDIT */}
                    <TouchableOpacity
                      onPress={() => {
                        setEditingNote(item);
                        setNewNote(item.content);
                        setOriginalNote(item.content); // 👈
                        sheetRef.current?.show();
                      }}
                      style={styles.iconBtn}
                    >
                      <Text style={styles.editIcon}>✎</Text>
                    </TouchableOpacity>

                    {/* DELETE */}
                    <TouchableOpacity
                      onPress={() => handleDeleteNote(item.id)}
                      style={styles.iconBtn}
                    >
                      <Text style={styles.cancelIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content */}
                <Text style={[typography.body, styles.noteText]}>
                  {item.content}
                </Text>
              </View>
            </AnimatedAppear>
          )}
        />
      )}

      {/* ---------- ACTION SHEET ---------- */}
      <ActionSheet
        ref={sheetRef}
        closeOnTouchBackdrop
        gestureEnabled={!hasUnsavedChanges}
        indicatorStyle={{ backgroundColor: colors.primary }}
        containerStyle={styles.sheet}
        onBeforeClose={() => {
          // ✅ Explicit close (save / discard)
          if (allowCloseRef.current) {
            allowCloseRef.current = false;
            return true;
          }

          // ✅ No changes → allow close
          if (!hasUnsavedChanges) {
            return true;
          }

          // ❌ Unsaved changes → block & alert
          Alert.alert(
            "Discard changes?",
            "If you leave now, your changes will be lost.",
            [
              {
                text: "Stay",
                style: "cancel",
                onPress: () => {
                  allowCloseRef.current = false;
                  sheetRef.current?.show();
                },
              },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => {
                  allowCloseRef.current = true;
                  resetNoteState();
                  sheetRef.current?.hide();
                },
              },
            ]
          );

          return false;
        }}
      >
        <SheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={[typography.title, styles.sheetTitle]}>
            {editingNote ? "Edit Note" : "Add Note"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Write a note..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={newNote}
            onChangeText={setNewNote}
          />
          <View style={styles.sheetActions}>
            <AppButton
              title={editingNote ? "Update Note" : "Add Note"}
              onPress={() => {
                if (editingNote) {
                  handleUpdateNote(editingNote.id, newNote);
                } else {
                  handleAddNote(newNote);
                }
              }}
            />
          </View>
        </SheetScrollView>
      </ActionSheet>
    </ScrollView>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },

  title: {
    color: colors.textPrimary,
    marginBottom: 16,
  },

  noteCard: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  noteTimestamp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },

  noteText: {
    color: colors.textPrimary,
  },

  noNotes: {
    marginTop: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },

  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  sheetTitle: {
    color: colors.textPrimary,
    marginBottom: 12,
  },

  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },

  skeletonCard: {
    height: 80,
    borderRadius: 12,
    backgroundColor: "#0b1220",
    marginBottom: 12,
    opacity: 0.5,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  noteActions: {
    flexDirection: "row",
    gap: 10,
  },

  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },

  editIcon: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "700",
  },

  cancelIcon: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetActions: {
    marginTop: 20,
  },

  deleteOutline: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    alignItems: "center",
  },

  deleteText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 14,
  },
});
