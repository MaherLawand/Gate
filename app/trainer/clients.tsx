import {
  addClient,
  addClientPackage,
  archiveClient,
  getTrainerClients,
  unarchiveClient,
  updateClient,
} from "@/src/services/ClientService";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppButton from "../../src/components/AppButton";
import { colors } from "../../src/theme/colors";
import { ClientProfile } from "../../src/types/models";

type ClientWithPackageStatus = ClientProfile & {
  hasActivePackage: boolean;
  needsRenewal: boolean;
};

export default function ClientsScreen() {
  // useEffect(() => {
  //   const run = async () => {
  //     let user = auth().currentUser;
  
  //     if (!user) {
  //       const res = await auth().signInAnonymously();
  //       user = res.user;
  //       user.uid="UC7Do8XOqPYOX5vaPG2uDlayg0E3";
  //     }
  
  //     console.log("AUTH UID:", user.uid);
  
  //     await testBookSession(user.uid); // ✅ THIS IS THE FIX
  //   };
  
  //   run();
  // }, []);
  

  const [clients, setClients] = useState<ClientWithPackageStatus[]>([]);

  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [isHijabi, setIsHijabi] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneRaw, setPhoneRaw] = useState(""); // +961XXXXXXXX

  // Search filter
  const [search, setSearch] = useState("");
  const [filteredClients, setFilteredClients] = useState<
    ClientWithPackageStatus[]
  >([]);
  // Sorting and filtering
  const [sortBy, setSortBy] = useState<"name" | "newest">("newest");

  // Show archived toggle
  const [showArchived, setShowArchived] = useState(false);

  const totalClients = clients.filter((c) => c.isActive).length;

  const [hasPackage, setHasPackage] = useState(false);
  const [packageSessions, setPackageSessions] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packagePaid, setPackagePaid] = useState(false);
  const [showNoPackageOnly, setShowNoPackageOnly] = useState(false);

  const formatLebanesePhone = (input: string) => {
    // Remove everything except digits
    let digits = input.replace(/\D/g, "");

    // Remove leading country code if user types it
    if (digits.startsWith("961")) {
      digits = digits.slice(3);
    }

    // Remove leading 0 if user types it
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    // Limit to 8 digits (Lebanese number)
    digits = digits.slice(0, 8);

    // Build formatted string
    let formatted = "+961";

    if (digits.length > 0) {
      formatted += " " + digits.slice(0, 2);
    }
    if (digits.length > 2) {
      formatted += " " + digits.slice(2, 5);
    }
    if (digits.length > 5) {
      formatted += " " + digits.slice(5, 8);
    }

    return {
      formatted,
      raw: digits.length === 8 ? `+961${digits}` : "",
      isValid: digits.length === 8,
    };
  };

  const fetchClients = async () => {
    setLoading(true);

    const baseClients = await getTrainerClients();

    const enrichedClients: ClientWithPackageStatus[] = await Promise.all(
      baseClients.map(async (client: ClientProfile) => {
        const packagesSnap = await firestore()
          .collection("clients")
          .doc(client.id!)
          .collection("packages")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        const latestPackage = packagesSnap.docs[0]?.data();

        const hasActivePackage = latestPackage?.status === "active";

        const needsRenewal =
          !latestPackage ||
          ["completed", "expired"].includes(latestPackage.status);

        return {
          ...client,
          hasActivePackage,
          needsRenewal,
        };
      })
    );

    setClients(enrichedClients);
    setLoading(false);
  };

  // Filter + search + sort
  useEffect(() => {
    let result = [...clients];

    // 🔹 EXCLUSIVE FILTER MODES
    if (showArchived) {
      // ONLY archived
      result = result.filter((c) => !c.isActive);
    } else if (showNoPackageOnly) {
      // ONLY clients with NO active package (but still active clients)
      result = result.filter((c) => c.isActive && !c.hasActivePackage);
    } else {
      // DEFAULT: ONLY active clients
      result = result.filter((c) => c.isActive);
    }

    // 🔍 Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((client) =>
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(lower)
      );
    }

    // 🔃 Sort
    if (sortBy === "name") {
      result.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      );
    } else {
      result.sort((a, b) => {
        const aTime = "toMillis" in a.createdAt ? a.createdAt.toMillis() : 0;
        const bTime = "toMillis" in b.createdAt ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    }

    setFilteredClients(result);
  }, [search, clients, sortBy, showArchived, showNoPackageOnly]);

  useEffect(() => {
    fetchClients();
  }, []);

  const handleArchiveClient = async (client: ClientProfile) => {
    try {
      await updateClient(client.id!, { isActive: !client.isActive });
      fetchClients();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleAddClient = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Error", "First and last name are required");
      return;
    }

    if (!gender) {
      Alert.alert("Missing info", "Please select the client's gender");
      return;
    }

    if (!phoneRaw) {
      Alert.alert(
        "Invalid phone",
        "Please enter a valid Lebanese phone number"
      );
      return;
    }

    try {
      // 1️⃣ Create client (NO AUTH YET)

      const newClient = await addClient({
        firstName,
        lastName,
        phone: phoneRaw,
        profilePicture: "",
        notificationsEnabled: true,
        bio: "",

        gender,
        isHijabi: gender === "female" ? isHijabi : false,
      });

      // 2️⃣ Optional package
      if (hasPackage && packageSessions) {
        await addClientPackage(newClient.id!, {
          totalSessions: Number(packageSessions),
          sessionsRemaining: Number(packageSessions),
          price: Number(packagePrice || 0),
          isPaid: packagePaid,
        });
      }

      // 3️⃣ Reset form
      setFirstName("");
      setLastName("");
      setPhone("");
      setPhoneRaw("");
      setHasPackage(false);
      setPackageSessions("");
      setPackagePrice("");
      setPackagePaid(false);
      setGender(null);
      setIsHijabi(false);
      setModalVisible(false);
      fetchClients();

      if (Platform.OS === "web") {
        window.confirm(
          "Client created.Client profile created. They can activate their account later using their phone number."
        );
      } else {
        Alert.alert(
          "Client created",
          "Client profile created. They can activate their account later using their phone number."
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const router = useRouter();

  const renderClientCard = ({ item }: { item: ClientWithPackageStatus }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => router.push(`/trainer/client/${item.id}` as any)}
      onLongPress={
        item.isActive
          ? () => {
              // 🚫 BLOCK archiving if client has active package
              if (item.hasActivePackage) {
                Alert.alert(
                  "Active package exists",
                  "This client has an active package. Please cancel the package before archiving."
                );
                return;
              }

              // ✅ Allow archive
              Alert.alert(
                "Archive Client",
                `Archive ${item.firstName} ${item.lastName}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Archive",
                    style: "destructive",
                    onPress: async () => {
                      await archiveClient(item.id!);
                      fetchClients();
                    },
                  },
                ]
              );
            }
          : undefined
      }
    >
      <Text style={styles.clientName}>
        {item.firstName} {item.lastName}
      </Text>
      {item.phone && <Text style={styles.clientPhone}>{item.phone}</Text>}

      {item.needsRenewal && (
        <Text style={{ color: "#ef4444", marginTop: 6, fontWeight: "700" }}>
          ⚠ Package expired — renewal required
        </Text>
      )}

      {/* Show Unarchive button for archived clients */}
      {!item.isActive && (
        <AppButton
          title="Unarchive"
          onPress={async () => {
            await unarchiveClient(item.id!);
            fetchClients();
          }}
        />
      )}
      {!item.phoneVerified && (
        <Text style={{ color: "#facc15", marginTop: 4 }}>
          Account not activated
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Clients</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalClients}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>📋</Text>
          <Text style={styles.statLabel}>Notes</Text>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search clients..."
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === "newest" && styles.sortActive]}
          onPress={() => setSortBy("newest")}
        >
          <Text style={styles.sortText}>Newest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortBy === "name" && styles.sortActive]}
          onPress={() => setSortBy("name")}
        >
          <Text style={styles.sortText}>A–Z</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, showNoPackageOnly && styles.sortActive]}
          onPress={() => {
            setShowNoPackageOnly((prev) => !prev);
            setShowArchived(false);
          }}
        >
          <Text style={styles.sortText}>
            {showNoPackageOnly ? "All Clients" : "No Active Package"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, showArchived && styles.sortActive]}
          onPress={() => {
            setShowArchived((prev) => !prev);
            setShowNoPackageOnly(false);
          }}
        >
          <Text style={styles.sortText}>
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Text>
        </TouchableOpacity>
      </View>

      <AppButton title="+ Add Client" onPress={() => setModalVisible(true)} />

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>

            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              style={styles.input}
              placeholder="+961 XX XXX XXX"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                const result = formatLebanesePhone(text);
                setPhone(result.formatted);
                setPhoneRaw(result.raw);
              }}
            />
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: "700",
                marginTop: 12,
              }}
            >
              Gender
            </Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  gender === "male" && styles.sortActive,
                ]}
                onPress={() => {
                  setGender("male");
                  setIsHijabi(false); // reset hijabi if switching
                }}
              >
                <Text style={styles.sortText}>Male</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortButton,
                  gender === "female" && styles.sortActive,
                ]}
                onPress={() => setGender("female")}
              >
                <Text style={styles.sortText}>Female</Text>
              </TouchableOpacity>
            </View>
            {gender === "female" && (
              <View style={{ marginTop: 12 }}>
                <AppButton
                  title={isHijabi ? "Hijabi ✓" : "Not Hijabi"}
                  variant="small"
                  onPress={() => setIsHijabi((v) => !v)}
                />
              </View>
            )}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                Package (optional)
              </Text>

              <AppButton
                title={hasPackage ? "Remove Package" : "Add Package"}
                variant="small"
                onPress={() => setHasPackage(!hasPackage)}
              />

              {hasPackage && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Total sessions (e.g. 16)"
                    keyboardType="numeric"
                    value={packageSessions}
                    onChangeText={setPackageSessions}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Price (e.g. 240)"
                    keyboardType="numeric"
                    value={packagePrice}
                    onChangeText={setPackagePrice}
                  />

                  <AppButton
                    title={packagePaid ? "Paid ✅" : "Not Paid ❌"}
                    variant="small"
                    onPress={() => setPackagePaid((p) => !p)}
                  />
                </>
              )}
            </View>

            <AppButton title="Add Client" onPress={handleAddClient} />
            <AppButton title="Cancel" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* Clients Grid */}
      {loading ? (
        <Text style={styles.loading}>Loading clients...</Text>
      ) : filteredClients.length === 0 ? (
        <Text style={styles.loading}>No clients found</Text>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id!}
          renderItem={renderClientCard}
          numColumns={3}
          columnWrapperStyle={{
            justifyContent: "space-between",
            marginBottom: 12,
          }}
          contentContainerStyle={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  clientCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 16,
  },
  clientPhone: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  archivedLabel: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  loading: {
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
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
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  sortRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sortButton: {
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sortActive: {
    backgroundColor: colors.primary,
  },
  sortText: {
    color: colors.white,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 4,
  },
});
