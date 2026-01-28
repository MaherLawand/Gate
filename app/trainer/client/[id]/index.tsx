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
import {
  addClientPackage,
  cancelPackage,
  deletePackage,
  getActivePackage,
  getClientPackages,
  reactivatePackage,
  renewPackage,
  updatePackage,
} from "../../../../src/services/ClientService";
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

import { ClientPackage } from "../../../../src/types/models";

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

  const [activePackage, setActivePackage] = useState<ClientPackage | null>(
    null
  );
  const [packageModalVisible, setPackageModalVisible] = useState(false);

  // Package form
  const [packagePrice, setPackagePrice] = useState("");
  const [packageSessions, setPackageSessions] = useState("");
  const [packagePaid, setPackagePaid] = useState(false);
  const [editingPackage, setEditingPackage] = useState(false);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const latestPackage = packages.length
    ? [...packages].sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() ?? new Date(0);
        const bDate = b.createdAt?.toDate?.() ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      })[0]
    : null;

  const needsRenewal = latestPackage?.status === "completed";
  const [highlightAddPackage, setHighlightAddPackage] = useState(false);
  useEffect(() => {
    if (expired === "1") {
      Alert.alert(
        "Package expired",
        "This client has no remaining sessions. Please add a new package."
      );

      setHighlightAddPackage(true);

      // auto-remove highlight after 2 seconds
      const t = setTimeout(() => setHighlightAddPackage(false), 2000);
      return () => clearTimeout(t);
    }
  }, [expired]);

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

  const fetchActivePackage = async () => {
    if (!id) return;
    const pkg = await getActivePackage(id);
    setActivePackage(pkg);
  };

  const fetchPackages = async () => {
    if (!id) return;

    const all = await getClientPackages(id);
    console.log("Fetched packages:");
    console.log(all);
    setPackages(all);
    setActivePackage(all.find((p) => p.status === "active") ?? null);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchClient();
      await fetchNotes(id!);
      await fetchPackages();
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleAddPackage = async () => {
    if (!packagePrice || !packageSessions) {
      Alert.alert("Missing fields", "Fill all package fields");
      return;
    }

    await addClientPackage(id!, {
      price: Number(packagePrice),
      totalSessions: Number(packageSessions),
      sessionsRemaining: Number(packageSessions),
      isPaid: packagePaid,
    });

    setPackageModalVisible(false);
    setPackagePrice("");
    setPackageSessions("");
    setPackagePaid(false);

    fetchActivePackage();
  };

  const handleSavePackage = async () => {
    if (!packagePrice || !packageSessions) {
      Alert.alert("Missing fields");
      return;
    }
    const hasCancelled = packages.some((p) => p.status === "cancelled");

    if (!editingPackage && hasCancelled) {
      if (Platform.OS === "web") {
        if (
          window.confirm(
            "Cancelled package exists. You must reactivate or resolve the cancelled package first."
          )
        )
          return;
      } else {
        Alert.alert(
          "Cancelled package exists",
          "You must reactivate or resolve the cancelled package first."
        );
        return;
      }
    }
    if (editingPackage && activePackage) {
      // EDIT existing package
      await updatePackage(id!, activePackage.id!, {
        price: Number(packagePrice),
        totalSessions: Number(packageSessions),
        sessionsRemaining: activePackage.sessionsRemaining,
        isPaid: packagePaid,
        paidAt: packagePaid ? serverTimestamp() : null,
      });
    } else {
      // RENEW (new package)
      await renewPackage(id!, {
        price: Number(packagePrice),
        totalSessions: Number(packageSessions),
        isPaid: packagePaid,
      });
    }

    setPackageModalVisible(false);
    setEditingPackage(false);
    await fetchPackages();
  };

  const handleCancelPackage = () => {
    if (!activePackage || !id) return;

    const confirmCancel = async () => {
      await cancelPackage(id!, activePackage.id!);
      await fetchPackages();
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Cancel package?\n\nThis will stop future sessions but keep the package."
      );
      if (ok) confirmCancel();
    } else {
      Alert.alert(
        "Cancel package?",
        "This will stop future sessions but keep the package.",
        [
          { text: "No", style: "cancel" },
          {
            text: "Cancel Package",
            style: "destructive",
            onPress: confirmCancel,
          },
        ]
      );
    }
  };

  const handleReactivatePackage = (pkgId: string) => {
    if (!id) return;

    const confirmReactivate = async () => {
      await reactivatePackage(id!, pkgId);
      await fetchPackages(); // refresh list + activePackage
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Reactivate package?\n\nThis will make this package active again."
      );
      if (ok) confirmReactivate();
    } else {
      Alert.alert(
        "Reactivate package?",
        "This will make this package active again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reactivate",
            onPress: confirmReactivate,
          },
        ]
      );
    }
  };

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

      {needsRenewal && (
        <Text style={styles.renewWarning}>
          Package expired — renewal required
        </Text>
      )}

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

        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>Package</Text>

          {activePackage ? (
            <View style={styles.packageCard}>
              <Text style={styles.packageText}>
                Sessions remaining:
                <Text style={styles.packageStrong}>
                  {activePackage.sessionsRemaining} /
                  {activePackage.totalSessions}
                </Text>
              </Text>

              <Text style={styles.packageText}>
                Price: ${activePackage.price}
              </Text>

              <Text style={styles.packageText}>
                Created:
                {activePackage.createdAt?.toDate
                  ? activePackage.createdAt.toDate().toISOString().split("T")[0]
                  : "—"}
              </Text>

              <Text style={styles.packageText}>
                Paid:
                {activePackage.paidAt?.toDate
                  ? activePackage.paidAt.toDate().toISOString().split("T")[0]
                  : "Not paid"}
              </Text>

              {/* STATUS LABEL */}
              <Text
                style={{
                  marginTop: 6,
                  marginBottom: 10,
                  color:
                    activePackage.status === "active"
                      ? "#22c55e"
                      : activePackage.status === "expired"
                      ? "#ef4444"
                      : "#f59e0b",
                  fontWeight: "700",
                }}
              >
                Status: {activePackage.status.toUpperCase()}
              </Text>

              {/* MARK AS PAID */}
              {!activePackage.isPaid && (
                <AppButton
                  title="Mark as Paid"
                  variant="small"
                  onPress={async () => {
                    await updatePackage(id!, activePackage.id!, {
                      isPaid: true,
                      paidAt: serverTimestamp(),
                    });
                    fetchPackages();
                  }}
                />
              )}

              {/* EDIT — ONLY IF ACTIVE */}
              {activePackage.status === "active" && (
                <AppButton
                  title="Edit Package"
                  variant="small"
                  onPress={() => {
                    setPackagePrice(String(activePackage.price));
                    setPackageSessions(String(activePackage.totalSessions));
                    setPackagePaid(activePackage.isPaid);
                    setEditingPackage(true);
                    setPackageModalVisible(true);
                  }}
                />
              )}

              {/* CANCEL — ONLY IF ACTIVE */}
              {activePackage.status === "active" && (
                <AppButton
                  title="Cancel Package"
                  variant="small"
                  onPress={handleCancelPackage}
                />
              )}

              {/* REACTIVATE — ONLY IF CANCELLED */}
              {activePackage.status === "cancelled" && (
                <AppButton
                  title="Reactivate Package"
                  variant="small"
                  onPress={async () => {
                    await reactivatePackage(id!, activePackage.id!);
                    fetchPackages();
                  }}
                />
              )}

              {/* RENEW — ONLY IF EXPIRED */}
              {activePackage.status === "expired" && (
                <AppButton
                  title="Renew Package"
                  variant="small"
                  onPress={() => {
                    setPackagePrice("");
                    setPackageSessions("");
                    setPackagePaid(false);
                    setEditingPackage(false);
                    setPackageModalVisible(true);
                  }}
                />
              )}

              {/* DELETE — DANGER ZONE */}
              <View style={{ marginTop: 16 }}>
                <AppButton
                  title="Delete Package"
                  onPress={() => {
                    Alert.alert(
                      "Delete package?",
                      "This should only be used for admin fixes.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            await deletePackage(id!, activePackage.id!);
                            fetchPackages();
                          },
                        },
                      ]
                    );
                  }}
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                highlightAddPackage && {
                  borderWidth: 2,
                  borderColor: colors.primary,
                  borderRadius: 14,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                },
              ]}
            >
              <AppButton
                title="+ Add Package"
                onPress={() => setPackageModalVisible(true)}
              />
            </View>
          )}

          {packages.length >= 1 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Past Packages</Text>

              {packages
                .filter((p) => p.status !== "active")
                .map((pkg) => (
                  <View
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      !pkg.isPaid && styles.unpaidHighlight,
                    ]}
                  >
                    <Text style={styles.packageText}>
                      {pkg.totalSessions} sessions — ${pkg.price}
                    </Text>

                    <Text style={styles.packageText}>
                      Created:
                      {pkg.createdAt?.toDate
                        ? pkg.createdAt.toDate().toISOString().split("T")[0]
                        : "—"}
                    </Text>

                    <Text style={styles.packageText}>
                      Paid:
                      {pkg.paidAt?.toDate
                        ? pkg.paidAt.toDate().toISOString().split("T")[0]
                        : "Not paid"}
                    </Text>

                    <Text style={styles.packageText}>Status: {pkg.status}</Text>

                    {pkg.status === "cancelled" && (
                      <AppButton
                        title="Reactivate Package"
                        variant="small"
                        onPress={() => handleReactivatePackage(pkg.id!)}
                      />
                    )}
                    {!pkg.isPaid && (
                      <>
                        <Text style={styles.unpaidBadge}>⚠ Unpaid</Text>

                        <AppButton
                          title="Mark as Paid"
                          variant="small"
                          onPress={async () => {
                            await updatePackage(id!, pkg.id!, {
                              isPaid: true,
                              paidAt: serverTimestamp(),
                            });
                            fetchPackages();
                          }}
                        />
                      </>
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>

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
      <Modal
        transparent
        visible={packageModalVisible}
        animationType="slide"
        onRequestClose={() => setPackageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Add Package</Text>

            <TextInput
              style={styles.input}
              placeholder="Total Sessions (e.g. 16)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={packageSessions}
              onChangeText={setPackageSessions}
            />

            <TextInput
              style={styles.input}
              placeholder="Price (e.g. 240)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={packagePrice}
              onChangeText={setPackagePrice}
            />

            <AppButton
              title={packagePaid ? "Paid ✓" : "Mark as Paid"}
              onPress={() => setPackagePaid(!packagePaid)}
            />

            <AppButton
              title={editingPackage ? "Update Package" : "Create Package"}
              onPress={handleSavePackage}
            />
            <AppButton
              title="Cancel"
              onPress={() => setPackageModalVisible(false)}
            />
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
  packageCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  packageText: {
    color: colors.textPrimary,
    marginBottom: 6,
  },
  packageStrong: {
    fontWeight: "700",
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
