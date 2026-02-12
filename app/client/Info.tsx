import { useClient } from "@/src/components/ClientContext";
import { typography } from "@/src/theme/typography";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getActivePackage,
  getClientSessions,
} from "../../src/services/ClientService";
import { colors } from "../../src/theme/colors";
import { SessionWithId } from "../../src/types/models";
import { useNavigation } from "@react-navigation/native";

/* ------------------ DATE HELPERS ------------------ */

const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday = 0
  d.setDate(d.getDate() - day);
  return d;
};

const getWeekDays = (date: Date) => {
  const start = getStartOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

/* ------------------ SCREEN ------------------ */

export default function ClientSessionsScreen() {
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace("/client/Gate");
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
    // Allow programmatic replaces
    if (e.data.action?.type === "REPLACE") return;

    e.preventDefault();
    router.replace("/client/Gate");
  });

  return unsub;
}, [navigation]);

  const params = useLocalSearchParams();
  const clientCtx = useClient();
  if (!clientCtx) {
    return null;
  }
  const clientId = clientCtx?.clientId ?? null;
  const clientLoading = clientCtx?.clientloading ?? true;

  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionWithId | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const getAttendanceBorderColor = (attendance?: string) => {
    console.log("attendance: ", attendance);
    switch (attendance) {
      case "confirmed":
      case "attended":
        return "#22c55e"; // green
      case "pending":
        return "#ffde21"; // orange
      case "charged":
      case "charged-no-show":
        return "#ef4444"; // red
      case "no_show":
        return "#9ca3af"; // gray
      default:
        return "transparent";
    }
  };

  /* ------------------ LOAD DATA ------------------ */

  useEffect(() => {
    console.log("clientId?: ", clientId);
    if (!clientId) return;

    const load = async () => {
      try {
        const sessionsData = await getClientSessions(clientId);
        console.log("sessionData: ", sessionsData);
        setSessions(sessionsData);

        // optional: preload package (future use)
        await getActivePackage(clientId);
      } catch (e: any) {
        Alert.alert("Error", e.message);
      }
    };

    load();
  }, [clientId]);

  /* ------------------ WEEK DATA ------------------ */

  const weekDays = useMemo(() => getWeekDays(activeDate), [activeDate]);

  const changeWeek = (delta: number) => {
    setActiveDate((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + delta * 7);
      return d;
    });
  };

  /* ------------------ DAY PRESS ------------------ */

  const onDayPress = (dateKey: string) => {
    const session = sessions.find((s) => s.date === dateKey);
    console.log("session pressed: ", session);

    if (!session) {
      Alert.alert("No session", "No session on this day.");
      return;
    }

    if (session.attendance !== "confirmed") {
      Alert.alert(
        "Session locked",
        "You can only open sessions that are confirmed."
      );
      return;
    }

    setSelectedDate(dateKey);
    setCurrentSession(session);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDate(null);
    setCurrentSession(null);
  };

  useEffect(() => {
    if (!modalVisible) return;

    const onBackPress = () => {
      closeModal();
      return true; // 👈 block default behavior
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () => sub.remove();
  }, [modalVisible]);
  /* ------------------ RENDER ------------------ */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.weekHeader}>
        <Pressable onPress={() => changeWeek(-1)}>
          <Text style={[typography.heading, styles.nav]}>‹</Text>
        </Pressable>

        <Text style={[typography.heading, { color: colors.textPrimary }]}>
          {activeDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </Text>

        <Pressable onPress={() => changeWeek(1)}>
          <Text style={[typography.heading, styles.nav]}>›</Text>
        </Pressable>
      </View>

      {/* WEEK CALENDAR */}
      <View style={styles.calendarCenter}>
        <View style={styles.weekGrid}>
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            console.log("key: ", key);
            const sessionForDay = sessions.find((s) => s.date === key);
            const hasSession = !!sessionForDay;
            const isToday = key === formatDateKey(new Date());

            const borderColor = getAttendanceBorderColor(
              sessionForDay?.attendance
            );
            console.log("borderColor: ", borderColor);
            console.log("sessionForDay: ", sessionForDay);

            return (
              <Pressable
                key={key}
                disabled={
                  !hasSession || sessionForDay?.attendance !== "confirmed"
                }
                onPress={() => onDayPress(key)}
                style={[
                  styles.dayCard,
                  hasSession && styles.activeDay,
                  isToday && styles.today,
                  hasSession && {
                    borderWidth: 2,
                    borderColor,
                  },
                  hasSession &&
                    sessionForDay?.attendance !== "confirmed" && {
                      opacity: 0.6,
                    },
                ]}
              >
                <Text
                  style={[typography.small, { color: colors.textSecondary }]}
                >
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </Text>

                <Text style={[typography.stat, { color: colors.textPrimary }]}>
                  {d.getDate()}
                </Text>

                {hasSession && (
                  <View
                    style={[
                      styles.sessionIndicator,
                      { backgroundColor: borderColor },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SESSION VIEW MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modal}>
          <Pressable onPress={closeModal}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              ← Back
            </Text>
          </Pressable>

          <Text style={[typography.title, { color: colors.textPrimary }]}>
            Session • {selectedDate}
          </Text>

          <ScrollView>
            {currentSession?.exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseCard}>
                <Text style={[typography.title, { color: colors.textPrimary }]}>
                  {ex.name}
                </Text>

                <View style={styles.readonlyGroup}>
                  {Array.isArray(ex.sets) ? (
                    ex.sets.map((set, setIndex) => (
                      <View key={setIndex} style={styles.readonlyRow}>
                        <Text
                          style={[
                            typography.small,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Set {setIndex + 1}
                        </Text>

                        <Text
                          style={[
                            typography.bodyMedium,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {set.reps} reps • {set.weightKg} kg
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text
                      style={[
                        typography.small,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Invalid set data
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  calendarCenter: {
    flex: 1,
    justifyContent: "center",
  },

  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  nav: {
    fontSize: 28,
    color: colors.primary,
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },

  dayCard: {
    width: "30%",
    minHeight: 170,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.4,
  },

  activeDay: {
    opacity: 1,
  },

  today: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  weekDay: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  dayNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  sessionIndicator: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 8,
  },

  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  back: {
    color: colors.textSecondary,
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },

  exerciseCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 10,
  },

  readonlyGroup: {
    gap: 10,
  },

  readonlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  readonlyLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  readonlyValue: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});
