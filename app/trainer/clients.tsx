import AnimatedAppear from "@/src/components/AnimatedAppear";
import ClientsGridSkeleton from "@/src/components/skeletons/Clients/ClientsGridSkeleton";
import SearchInputSkeleton from "@/src/components/skeletons/Clients/SearchInputSkeleton";
import SortRowSkeleton from "@/src/components/skeletons/Clients/SortRowSkeleton";
import StatsRowSkeleton from "@/src/components/skeletons/Clients/StatsRowSkeleton";
import {
  addClient,
  addClientPackage,
  archiveClient,
  clientExistsByPhone,
  getTrainerClients,
  unarchiveClient,
} from "@/src/services/ClientService";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
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
import { ExpandingDot } from "react-native-animated-pagination-dots";
import PagerView from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";
import AppButton from "../../src/components/AppButton";
import { colors } from "../../src/theme/colors";
import { ClientProfile } from "../../src/types/models";

import { typography } from "@/src/theme/typography";
import ActionSheet, {
  ActionSheetRef,
  ScrollView,
} from "react-native-actions-sheet";

const DEV_SKELETON_DELAY = 2200; // ms
const DEFAULT_AVATAR = require("../../assets/images/avatar-placeholder.png");

const CARD_HEIGHT = 180;

const ITEMS_PER_PAGE = 4; // ✅ fixed
const COLUMNS = 2;
const ROWS_PER_PAGE = 2;

const { width: PAGE_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (PAGE_WIDTH - 24 * 2 - 16) / 2;

const PAGER_HEIGHT = ROWS_PER_PAGE * (CARD_HEIGHT + 16) + 8;

type ClientWithPackageStatus = ClientProfile & {
  hasActivePackage: boolean;
  needsRenewal: boolean;
};
type ClientCardProps = {
  item: ClientWithPackageStatus;
  index: number;
  onArchive?: () => void;
  onUnarchive?: () => void;
};
function ClientCard({ item, index, onArchive, onUnarchive }: ClientCardProps) {
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
  const actionScalePackages = useRef(new Animated.Value(1)).current;
  const actionScaleSessions = useRef(new Animated.Value(1)).current;
  const actionScaleNotes = useRef(new Animated.Value(1)).current;
  const pressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.88,
      stiffness: 300,
      damping: 18,
      mass: 0.4,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      stiffness: 220,
      damping: 16,
      useNativeDriver: true,
    }).start();
  };

  const shimmerX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  //check this out later
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
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
      style={[
        styles.cardShadow,
        {
          opacity: anim,
          transform: [
            { perspective: 800 },
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
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
            { scale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={item.isActive ? onArchive : undefined}
        activeOpacity={1}
        style={styles.clientCard}
      >
        {/* AVATAR */}
        <View style={styles.profileContent}>
          <Image
            source={
              item.profilePicture
                ? { uri: item.profilePicture }
                : DEFAULT_AVATAR
            }
            style={styles.avatar}
          />

          {/* NAME */}
          <View style={styles.nameRow}>
            <Text
              style={[typography.bodyMedium, styles.clientName]}
              numberOfLines={1}
            >
              {item.firstName} {item.lastName}
            </Text>

            <View
              style={[
                styles.statusDot,
                item.hasActivePackage
                  ? styles.dotActivePackage
                  : item.needsRenewal
                  ? styles.dotCancelled
                  : styles.dotInactive,
              ]}
            />
          </View>
        </View>
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
          <Animated.View
            style={{
              transform: [
                { scale: actionScalePackages },
                {
                  translateY: actionScalePackages.interpolate({
                    inputRange: [0.88, 1],
                    outputRange: [2, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.actionBtn}
              onPressIn={() => pressIn(actionScalePackages)}
              onPressOut={() => pressOut(actionScalePackages)}
              onPress={() =>
                router.push(`/trainer/client/${item.id}/packages` as any)
              }
            >
              <LinearGradient
                colors={[
                  "rgba(239,68,68,0.35)",
                  "rgba(239,68,68,0.05)",
                  "rgba(239,68,68,0)",
                ]}
                style={StyleSheet.absoluteFill}
                start={{ x: 1, y: 1 }}
                end={{ x: -0.5, y: -0.5 }}
              />

              <Ionicons name="cube-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              transform: [
                { scale: actionScaleSessions },
                {
                  translateY: actionScaleSessions.interpolate({
                    inputRange: [0.88, 1],
                    outputRange: [2, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.actionBtn}
              onPressIn={() => pressIn(actionScaleSessions)}
              onPressOut={() => pressOut(actionScaleSessions)}
              onPress={() =>
                router.push(`/trainer/client/${item.id}/sessions` as any)
              }
            >
              <LinearGradient
                colors={[
                  "rgba(239,68,68,0.35)",
                  "rgba(239,68,68,0.05)",
                  "rgba(239,68,68,0)",
                ]}
                style={StyleSheet.absoluteFill}
                start={{ x: 1, y: 1 }}
                end={{ x: -0.5, y: -0.5 }}
              />

              <Ionicons name="barbell-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View
            style={{
              transform: [
                { scale: actionScaleNotes },
                {
                  translateY: actionScaleNotes.interpolate({
                    inputRange: [0.88, 1],
                    outputRange: [2, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.actionBtn}
              onPressIn={() => pressIn(actionScaleNotes)}
              onPressOut={() => pressOut(actionScaleNotes)}
              onPress={() =>
                router.push(`/trainer/client/${item.id}/notes` as any)
              }
            >
              <LinearGradient
                colors={[
                  "rgba(239,68,68,0.35)",
                  "rgba(239,68,68,0.05)",
                  "rgba(239,68,68,0)",
                ]}
                style={StyleSheet.absoluteFill}
                start={{ x: 1, y: 1 }}
                end={{ x: -0.5, y: -0.5 }}
              />
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#ef4444"
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ClientsScreen() {
  const getPagerHeight = (itemsCount: number) => {
    const rows = Math.ceil(itemsCount / COLUMNS); // COLUMNS = 2
    return rows * (CARD_HEIGHT + 16) + 8;
  };
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace("/trainer/dashboard");
        return true; // ⛔ block default back
      };

      // Android hardware back
      const sub =
        Platform.OS === "android"
          ? BackHandler.addEventListener("hardwareBackPress", onBack)
          : null;

      return () => {
        sub?.remove();
      };
    }, [])
  );

  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const unsub = navigation.addListener("beforeRemove", (e) => {
      // Allow programmatic redirects
      if (e.data.action?.type === "REPLACE") return;

      e.preventDefault();

      router.replace("/trainer/dashboard");
    });

    return unsub;
  }, [navigation]);
  const [clients, setClients] = useState<ClientWithPackageStatus[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">(
    "all"
  );
  const [isHijabi, setIsHijabi] = useState(false);

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
  const scrollX = useRef(new Animated.Value(0)).current;

  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");
  const [focused, setFocused] = useState(false);
  const dragY = useRef(new Animated.Value(0)).current;
  const animatedIndex = useSharedValue(0);

  const allowCloseRef = useRef(false);

  const originalFormRef = useRef({
    firstName: "",
    lastName: "",
    digits: "",
    gender: null as "male" | "female" | null,
    isHijabi: false,
    hasPackage: false,
    packageSessions: "",
    packagePrice: "",
    packagePaid: false,
  });

  const handlePhoneChange = (text: string) => {
    // digits only
    let d = text.replace(/\D/g, "");

    // max Lebanese length
    d = d.slice(0, 8);

    setDigits(d);
  };
  const getPhoneRaw = () => {
    if (digits.length !== 8) return "";

    // normalize on submit
    const normalized = digits.startsWith("0") ? digits.slice(1) : digits;

    return `+961${normalized}`;
  };
  const formatLebanese = (d: string) => {
    if (d.length !== 8) return d;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  };

  const resetClientForm = () => {
    setFirstName("");
    setLastName("");
    setDigits(""); // ✅ reset digits
    setFocused(false); // ✅ reset focus
    setGender(null);
    setIsHijabi(false);

    setHasPackage(false);
    setPackageSessions("");
    setPackagePrice("");
    setPackagePaid(false);

    originalFormRef.current = {
      firstName: "",
      lastName: "",
      digits: "",
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
    digits !== originalFormRef.current.digits ||
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
          ["completed", "expired", "cancelled"].includes(latestPackage.status);

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
    // 👤 Gender filter
    if (genderFilter !== "all") {
      result = result.filter((c) => c.gender === genderFilter);
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
  }, [search, clients, sortBy, showArchived, showNoPackageOnly, genderFilter]);

  useFocusEffect(
    useCallback(() => {
      console.log("🟢 Clients screen focused → refresh data");

      fetchClients(); // 👈 your refresh logic here

      return () => {
        console.log("🟡 Clients screen unfocused");
      };
    }, [])
  );

  const pages = useMemo(() => {
    const result: ClientWithPackageStatus[][] = [];

    for (let i = 0; i < filteredClients.length; i += ITEMS_PER_PAGE) {
      result.push(filteredClients.slice(i, i + ITEMS_PER_PAGE));
    }

    return result;
  }, [filteredClients]);

  const currentPageData = pages[page - 1] ?? [];
  const totalPages = pages.length;

  const handleAddClient = async () => {
    if (!firstName || !lastName) {
      Alert.alert("Error", "First and last name are required");
      return;
    }

    if (!gender) {
      Alert.alert("Missing info", "Please select the client's gender");
      return;
    }
    const raw = getPhoneRaw();
    if (!raw) {
      Alert.alert(
        "Invalid phone",
        "Please enter a valid Lebanese phone number"
      );
      return;
    }

    // 🔍 CHECK DUPLICATE PHONE
    const exists = await clientExistsByPhone(raw);

    if (exists) {
      Alert.alert(
        "Client already exists",
        "A client with this phone number already exists in your list."
      );
      return;
    }
    try {
      // 1️⃣ Create client (NO AUTH YET)

      const newClient = await addClient({
        firstName,
        lastName,
        phone: raw,
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
          // toValue: e.endCoordinates.height - 20,
          //check this out later
          toValue: Math.max(0, e.endCoordinates.height - 40),
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
      digits,
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[typography.heading, styles.title]}>Your Clients</Text>
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
                <Text style={[typography.stat, styles.statNumber]}>
                  {totalClients}
                </Text>
                <Text style={[typography.small, styles.statLabel]}>
                  Clients
                </Text>
              </View>
            </View>
          </AnimatedAppear>
          <AnimatedAppear delay={120}>
            <TextInput
              style={[typography.body, styles.searchInput]}
              placeholder="Search clients..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </AnimatedAppear>
          <AnimatedAppear delay={240}>
            <View style={styles.sortRow}>
              {/* GENDER FILTER */}
              <View style={styles.filterGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    genderFilter === "all" && styles.filterActive,
                  ]}
                  onPress={() => setGenderFilter("all")}
                >
                  <Text style={[typography.small, styles.filterText]}>All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    genderFilter === "male" && styles.filterActive,
                  ]}
                  onPress={() => setGenderFilter("male")}
                >
                  <Text style={[typography.small, styles.filterText]}>♂</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    genderFilter === "female" && styles.filterActive,
                  ]}
                  onPress={() => setGenderFilter("female")}
                >
                  <Text style={[typography.small, styles.filterText]}>♀</Text>
                </TouchableOpacity>
              </View>

              {/* SORT */}
              <View style={styles.filterGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    sortBy === "newest" && styles.filterActive,
                  ]}
                  onPress={() => setSortBy("newest")}
                >
                  <Text style={[typography.small, styles.filterText]}>
                    Newest
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    sortBy === "name" && styles.filterActive,
                  ]}
                  onPress={() => setSortBy("name")}
                >
                  <Text style={[typography.small, styles.filterText]}>A–Z</Text>
                </TouchableOpacity>
              </View>

              {/* SPECIAL FILTERS */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  showNoPackageOnly && styles.filterActive,
                ]}
                onPress={() => {
                  setShowNoPackageOnly((v) => !v);
                  setShowArchived(false);
                }}
              >
                <Text style={[typography.small, styles.filterText]}>
                  No Package
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, showArchived && styles.filterActive]}
                onPress={() => {
                  setShowArchived((v) => !v);
                  setShowNoPackageOnly(false);
                }}
              >
                <Text style={[typography.small, styles.filterText]}>
                  Archived
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
            <Text style={[typography.heading, styles.modalTitle]}>
              Add New Client
            </Text>

            {/* FIRST NAME */}
            <TextInput
              style={[typography.body, styles.input]}
              placeholder="First Name"
              placeholderTextColor={colors.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />

            {/* LAST NAME */}
            <TextInput
              style={[typography.body, styles.input]}
              placeholder="Last Name"
              placeholderTextColor={colors.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />

            {/* PHONE */}
            <View style={styles.phoneRow}>
              <View style={styles.prefixBox}>
                <Text style={[typography.bodyMedium, styles.prefixText]}>
                  +961
                </Text>
              </View>

              <TextInput
                style={[typography.body, styles.phoneInput]}
                keyboardType="number-pad"
                placeholder="XX XXX XXX"
                placeholderTextColor={colors.textSecondary}
                value={focused ? digits : formatLebanese(digits)}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            {/* GENDER */}
            <Text style={[typography.bodyMedium, styles.sectionTitle]}>
              Gender
            </Text>
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
                <Text style={[typography.bodyMedium, styles.choiceText]}>
                  Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choice,
                  gender === "female" && styles.choiceActive,
                ]}
                onPress={() => setGender("female")}
              >
                <Text style={[typography.bodyMedium, styles.choiceText]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>

            {/* HIJABI */}
            {gender === "female" && (
              <View style={{ marginTop: 12 }}>
                <Text style={[typography.bodyMedium, styles.sectionTitle]}>
                  Hijab
                </Text>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.choice, isHijabi && styles.choiceActive]}
                    onPress={() => setIsHijabi(true)}
                  >
                    <Text style={[typography.bodyMedium, styles.choiceText]}>
                      🧕 Hijabi
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.choice, !isHijabi && styles.choiceActive]}
                    onPress={() => setIsHijabi(false)}
                  >
                    <Text style={[typography.bodyMedium, styles.choiceText]}>
                      🚫 Not Hijabi
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* PACKAGE */}
            {/* <View style={{ marginTop: 20 }}>
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
            </View> */}

            {/* ACTIONS */}
            <View style={styles.footer}>
              <AppButton title="Add Client" onPress={handleAddClient} />
              {/* <AppButton title="Cancel" variant="small" onPress={closeSheet} /> */}
            </View>
          </ScrollView>
        </AnimatedAppear>
      </ActionSheet>
      {/* Clients Grid */}
      {loading ? (
        <ClientsGridSkeleton />
      ) : filteredClients.length === 0 ? (
        <Text style={[typography.small, styles.loading]}>No clients found</Text>
      ) : (
        <View style={styles.pagerSection}>
          {/*check this out later*/}
          <PagerView
            style={{
              // height: getPagerHeight(pages[page - 1]?.length || 0),
              height: PAGER_HEIGHT,
            }}
            initialPage={0}
            overdrag={false}
            onPageScroll={(e) => {
              const offset =
                (e.nativeEvent.position + e.nativeEvent.offset) * PAGE_WIDTH;
              scrollX.setValue(offset);
            }}
          >
            {pages.map((pageData, pageIndex) => (
              <View
                key={pageIndex}
                style={{ height: PAGER_HEIGHT, paddingTop: 16 }}
              >
                <FlatList
                  data={pageData}
                  keyExtractor={(item) => item.id!}
                  renderItem={renderClientCard}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={{
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                />
              </View>
            ))}
          </PagerView>
          {/* <View style={styles.pagination}>
            <View style={styles.dots}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, page === i + 1 && styles.dotActive]}
                />
              ))}
            </View>
          </View> */}
          <View style={styles.pagination}>
            <ExpandingDot
              data={pages}
              scrollX={scrollX}
              expandingDotWidth={18}
              dotStyle={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 6,
              }}
              activeDotColor={colors.primary}
              inActiveDotColor="rgba(255,255,255,0.3)"
              containerStyle={{ marginTop: 8 }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  clientCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: colors.card,
    borderRadius: 16,

    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,

    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: "space-between",
    overflow: "hidden", // 🔑 THIS IS THE FIX
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  shimmer: {
    width: "140%",
    height: "100%",
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
    textAlign: "center",
    marginTop: 2,
    height: 30,
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
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  pagination: {
    flexDirection: "row",
    height: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    gap: 16,
    borderWidth: 1,
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
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",

    // DARK GLASS BASE
    backgroundColor: "rgba(18, 18, 22, 0.55)",

    // SUBTLE BORDER
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  actionGlow: {
    borderRadius: 14,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",

    paddingTop: 14,
    paddingBottom: 6,

    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  profileContent: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56, // ⬇️ less vertical claim
  },

  actionIcon: {
    fontSize: 14,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    overflow: "hidden",
  },

  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border ?? "rgba(255,255,255,0.08)",
  },

  prefixText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },

  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
  filterGroup: {
    flexDirection: "row",
    gap: 6,
  },

  filterChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  filterActive: {
    backgroundColor: colors.primary,
  },

  filterText: {
    color: colors.white,
  },
  pagerSection: {
    width: "100%",
  },

  dotsContainer: {
    marginTop: 6,
    opacity: 0.9,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline", // 🔑 key change
    justifyContent: "center",
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2, // 🔥 fine-tune vertical alignment
  },

  dotActivePackage: {
    backgroundColor: "#22c55e", // green
  },

  dotInactive: {
    backgroundColor: "#ef4444", // red
  },

  dotCancelled: {
    backgroundColor: "#f59e0b", // orange
  },
  cardShadow: {
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },

});
