import AnimatedAppear from "@/src/components/AnimatedAppear";
import ClientsGridSkeleton from "@/src/components/skeletons/Clients/ClientsGridSkeleton";
import SearchInputSkeleton from "@/src/components/skeletons/Clients/SearchInputSkeleton";
import SortRowSkeleton from "@/src/components/skeletons/Clients/SortRowSkeleton";
import StatsRowSkeleton from "@/src/components/skeletons/Clients/StatsRowSkeleton";
import {
  addClient,
  addClientPackage,
  archiveClient,
  getTrainerClients,
  unarchiveClient,
  updateClient,
} from "@/src/services/ClientService";
import firestore from "@react-native-firebase/firestore";
import { router, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import AppButton from "../../src/components/AppButton";
import { colors } from "../../src/theme/colors";
import { ClientProfile } from "../../src/types/models";

import ActionSheet, {
  ActionSheetRef,
  ScrollView,
} from "react-native-actions-sheet";

const ITEMS_PER_PAGE = 5;
const DEV_SKELETON_DELAY = 2200; // ms
const DEFAULT_AVATAR = require("../../assets/images/avatar-placeholder.png");

type ClientWithPackageStatus = ClientProfile & {
  hasActivePackage: boolean;
  needsRenewal: boolean;
};
type ClientCardProps = {
  item: ClientWithPackageStatus;
  index: number;

  onOpen: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
};
function ClientCard({
  item,
  index,
  onOpen,
  onArchive,
  onUnarchive,
}: ClientCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  const packageText = item.needsRenewal
    ? "Package expired"
    : item.hasActivePackage
    ? "Active package"
    : "No package";

  const accountText = item.phoneVerified
    ? "Account verified"
    : "Account not verified";
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderMove: (_, g) => {
        tiltX.setValue(g.dy / 20);
        tiltY.setValue(-g.dx / 20);
      },

      onPanResponderRelease: () => {
        Animated.spring(tiltX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();

        Animated.spring(tiltY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        flex: 1,
        opacity: anim,
        transform: [
          { perspective: 800 },

          // ENTRY ANIMATION
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },

          // 3D TILT
          {
            rotateX: tiltX.interpolate({
              inputRange: [-2, 2],
              outputRange: ["-10deg", "10deg"],
            }),
          },
          {
            rotateY: tiltY.interpolate({
              inputRange: [-2, 2],
              outputRange: ["-10deg", "10deg"],
            }),
          },

          // PRESS SCALE
          { scale },
        ],
      }}
    >
      <TouchableOpacity
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={item.isActive ? onOpen : undefined}
        onLongPress={item.isActive ? onArchive : undefined}
        activeOpacity={1}
        style={styles.clientCard}
      >
        {/* AVATAR */}
        <Image
          source={
            item.profilePicture ? { uri: item.profilePicture } : DEFAULT_AVATAR
          }
          style={styles.avatar}
        />

        {/* NAME */}
        <Text style={styles.clientName} numberOfLines={2}>
          {item.firstName} {item.lastName}
        </Text>

        {/* STATUS BLOCK */}
        {/* <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              item.needsRenewal && styles.statusWarning,
            ]}
            numberOfLines={1}
          >
            {packageText}
          </Text>

          <Text
            style={[
              styles.statusText,
              !item.phoneVerified && styles.statusMuted,
            ]}
            numberOfLines={1}
          >
            {accountText}
          </Text>
        </View> */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push(`/trainer/client/${item.id}/packages` as any)
            }
          >
            <Text style={styles.actionIcon}>📦</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push(`/trainer/client/${item.id}/sessions` as any)
            }
          >
            <Text style={styles.actionIcon}>🏋️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              router.push(`/trainer/client/${item.id}/notes` as any)
            }
          >
            <Text style={styles.actionIcon}>📝</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ClientsScreen() {
  const [clients, setClients] = useState<ClientWithPackageStatus[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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

  const dragY = useRef(new Animated.Value(0)).current;

  const allowCloseRef = useRef(false);

  const originalFormRef = useRef({
    firstName: "",
    lastName: "",
    phoneRaw: "",
    gender: null as "male" | "female" | null,
    isHijabi: false,
    hasPackage: false,
    packageSessions: "",
    packagePrice: "",
    packagePaid: false,
  });

  const resetClientForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setPhoneRaw("");
    setGender(null);
    setIsHijabi(false);

    setHasPackage(false);
    setPackageSessions("");
    setPackagePrice("");
    setPackagePaid(false);

    originalFormRef.current = {
      firstName: "",
      lastName: "",
      phoneRaw: "",
      gender: null,
      isHijabi: false,
      hasPackage: false,
      packageSessions: "",
      packagePrice: "",
      packagePaid: false,
    };
  };
  const hasUnsavedChanges =
    firstName !== originalFormRef.current.firstName ||
    lastName !== originalFormRef.current.lastName ||
    phoneRaw !== originalFormRef.current.phoneRaw ||
    gender !== originalFormRef.current.gender ||
    isHijabi !== originalFormRef.current.isHijabi ||
    hasPackage !== originalFormRef.current.hasPackage ||
    packageSessions !== originalFormRef.current.packageSessions ||
    packagePrice !== originalFormRef.current.packagePrice ||
    packagePaid !== originalFormRef.current.packagePaid;

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
    setTimeout(() => {
      setLoading(true);
    }, DEV_SKELETON_DELAY);

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
          ["completed", "expired", "cancelled"].includes(latestPackage.status);

        return {
          ...client,
          hasActivePackage,
          needsRenewal,
        };
      })
    );

    setClients(enrichedClients);
    setTimeout(() => {
      setLoading(false);
    }, DEV_SKELETON_DELAY);
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

  const pages = useMemo(() => {
    const result: ClientWithPackageStatus[][] = [];

    for (let i = 0; i < filteredClients.length; i += ITEMS_PER_PAGE) {
      result.push(filteredClients.slice(i, i + ITEMS_PER_PAGE));
    }

    return result;
  }, [filteredClients]);

  const currentPageData = pages[page - 1] ?? [];
  const totalPages = pages.length;

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

      // ✅ AFTER successful creation
      allowCloseRef.current = true; // 🔓 allow close
      resetClientForm(); // 🧼 neutralize dirty state
      sheetRef.current?.hide(); // ✅ close silently
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

  // const modalAnim = useRef(new Animated.Value(0)).current;

  // useEffect(() => {
  //   if (modalVisible) {
  //     modalAnim.setValue(0);
  //     Animated.timing(modalAnim, {
  //       toValue: 1,
  //       duration: 260,
  //       easing: Easing.out(Easing.cubic),
  //       useNativeDriver: true,
  //     }).start();
  //   }
  // }, [modalVisible]);

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
      sheetTranslateY.setValue(1);
      contentAnim.setValue(0);

      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 1,
          duration: 860,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible]);

  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height - 20,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const sheetTranslateY = useRef(new Animated.Value(1)).current;
  const animatedSheetStyle = {
    transform: [
      {
        translateY: Animated.add(
          Animated.add(
            sheetTranslateY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 700],
            }),
            Animated.multiply(keyboardOffset, -1)
          ),
          dragY
        ),
      },
    ],
  };

  const sheetRef = useRef<ActionSheetRef>(null);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 1,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeModal();
    });
  };
  const closeSheet = () => {
    allowCloseRef.current = true;
    resetClientForm();
    sheetRef.current?.hide();
    contentAnim.setValue(0);
  };

  const openAddClient = () => {
    originalFormRef.current = {
      firstName,
      lastName,
      phoneRaw,
      gender,
      isHijabi,
      hasPackage,
      packageSessions,
      packagePrice,
      packagePaid,
    };
    allowCloseRef.current = false;
    contentAnim.setValue(0); // reset animation
    sheetRef.current?.show(); // open sheet

    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const renderClientCard = ({
    item,
    index,
  }: {
    item: ClientWithPackageStatus;
    index: number;
  }) => (
    <ClientCard
      item={item}
      index={index}
      onOpen={() => router.push(`/trainer/client/${item.id}` as any)}
      onArchive={() => {
        if (item.hasActivePackage) {
          Alert.alert(
            "Active package exists",
            "Cancel the package before archiving."
          );
          return;
        }

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
      }}
      onUnarchive={async () => {
        await unarchiveClient(item.id!);
        fetchClients();
      }}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Clients</Text>
      {loading ? (
        <>
          <StatsRowSkeleton />
          <SearchInputSkeleton />
          <SortRowSkeleton />
        </>
      ) : (
        <>
          <AnimatedAppear delay={40}>
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
          </AnimatedAppear>
          <AnimatedAppear delay={120}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </AnimatedAppear>
          <AnimatedAppear delay={240}>
            <View style={styles.sortRow}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "newest" && styles.sortActive,
                ]}
                onPress={() => setSortBy("newest")}
              >
                <Text style={styles.sortText}>Newest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "name" && styles.sortActive,
                ]}
                onPress={() => setSortBy("name")}
              >
                <Text style={styles.sortText}>A–Z</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortButton,
                  showNoPackageOnly && styles.sortActive,
                ]}
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
          </AnimatedAppear>
        </>
      )}

      <AppButton
        title="+ Add Client"
        onPress={openAddClient}
        disabled={loading}
      />

      {/* Modal */}
      <ActionSheet
        ref={sheetRef}
        gestureEnabled={!hasUnsavedChanges}
        closeOnTouchBackdrop
        keyboardHandlerEnabled
        indicatorStyle={{ backgroundColor: "transparent" }} // ❌ removes white bar
        containerStyle={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8, // tighter top
        }}
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

          // ❌ Unsaved changes → warn
          Alert.alert(
            "Discard changes?",
            "If you leave now, your changes will be lost.",
            [
              { text: "Stay", style: "cancel",onPress: () => {
                allowCloseRef.current = false;
                sheetRef.current?.show();
              }, },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => {
                  allowCloseRef.current = true;
                  resetClientForm();
                  sheetRef.current?.hide();
                },
              },
            ]
          );

          return false; // ⛔ block close
        }}
      >
        <AnimatedAppear delay={240}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 40,
            }}
          >
            {/* HANDLE */}
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.primary, // 🔴 red handle
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* TITLE */}
            <Text style={styles.modalTitle}>Add New Client</Text>

            {/* FIRST NAME */}
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />

            {/* LAST NAME */}
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />

            {/* PHONE */}
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

            {/* GENDER */}
            <Text style={styles.sectionTitle}>Gender</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.choice,
                  gender === "male" && styles.choiceActive,
                ]}
                onPress={() => {
                  setGender("male");
                  setIsHijabi(false);
                }}
              >
                <Text style={styles.choiceText}>Male</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choice,
                  gender === "female" && styles.choiceActive,
                ]}
                onPress={() => setGender("female")}
              >
                <Text style={styles.choiceText}>Female</Text>
              </TouchableOpacity>
            </View>

            {/* HIJABI */}
            {gender === "female" && (
              <View style={{ marginTop: 12 }}>
                <AppButton
                  title={isHijabi ? "Hijabi ✓" : "Not Hijabi"}
                  variant="small"
                  onPress={() => setIsHijabi((v) => !v)}
                />
              </View>
            )}
            {/* PACKAGE */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Package (optional)</Text>

              <AppButton
                title={hasPackage ? "Remove Package" : "Add Package"}
                variant="small"
                onPress={() => setHasPackage((v) => !v)}
              />

              {hasPackage && (
                <View style={{ marginTop: 12 }}>
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
                    title={packagePaid ? "Paid ✓" : "Not Paid"}
                    variant="small"
                    onPress={() => setPackagePaid((v) => !v)}
                  />
                </View>
              )}
            </View>

            {/* ACTIONS */}
            <View style={styles.footer}>
              <AppButton title="Add Client" onPress={handleAddClient} />
              <AppButton title="Cancel" variant="small" onPress={closeSheet} />
            </View>
          </ScrollView>
        </AnimatedAppear>
      </ActionSheet>
      {/* Clients Grid */}
      {loading ? (
        <ClientsGridSkeleton />
      ) : filteredClients.length === 0 ? (
        <Text style={styles.loading}>No clients found</Text>
      ) : (
        <>
          <PagerView
            style={{ flex: 1 }}
            initialPage={0}
            onPageSelected={(e) => {
              setPage(e.nativeEvent.position + 1);
            }}
          >
            {pages.map((pageData, pageIndex) => (
              <View key={pageIndex} style={{ paddingTop: 16 }}>
                <FlatList
                  data={pageData}
                  keyExtractor={(item) => item.id!}
                  renderItem={renderClientCard}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={{
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                />
              </View>
            ))}
          </PagerView>

          {/* PAGE INDICATOR */}
          <View style={styles.pagination}>
            <View style={styles.dots}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, page === i + 1 && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  clientCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flex: 1,
    marginHorizontal: 4,

    alignItems: "center",
    justifyContent: "flex-start",
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 8,
    backgroundColor: colors.border,
  },

  clientName: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 6,
  },

  statusContainer: {
    alignItems: "center",
    gap: 2,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
  },

  statusWarning: {
    color: "#f97316", // orange
    fontWeight: "600",
  },

  statusMuted: {
    color: "#9ca3af", // gray
  },

  archivedCard: {
    opacity: 0.55,
  },

  bottomSheet: {
    width: "100%", // ✅ fixes left-lean issue
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
  },

  packageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  dotActiveStatus: {
    backgroundColor: "#22c55e", // green
  },

  dotWarning: {
    backgroundColor: colors.primary, // orange
  },

  dotNone: {
    backgroundColor: "#64748b", // gray
  },

  lockIcon: {
    fontSize: 11,
    opacity: 0.7,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border ?? "#444",
    alignSelf: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  choice: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
  },

  choiceActive: {
    backgroundColor: colors.primary,
  },

  choiceText: {
    color: colors.white,
    fontWeight: "600",
  },

  footer: {
    marginTop: 20,
    gap: 8,
  },
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
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 16,
  },

  pageBtn: {
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  pageDisabled: {
    opacity: 0.4,
  },

  pageText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  pageIndicator: {
    color: colors.textSecondary,
    fontWeight: "600",
  },

  pageArrow: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
  },

  arrowText: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  dots: {
    flexDirection: "row",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border ?? "#444",
  },

  dotActive: {
    backgroundColor: colors.primary,
    width: 10,
    height: 10,
  },
  warning: {
    color: "#ef4444", // red warning
    marginTop: 6,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },

  inactiveText: {
    color: "#facc15", // yellow / amber
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  modalCard: {
    width: "90%",
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 20,
    zIndex: 2,
  },

  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },

  section: {
    marginTop: 16,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },

  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },

  actionIcon: {
    fontSize: 14,
  },
});
