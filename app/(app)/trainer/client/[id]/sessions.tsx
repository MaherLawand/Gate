import { getExercises } from "@/src/services/ExerciseService";
import { typography } from "@/src/theme/typography";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { log, error } from "@/src/utils/logger";

import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../../../../src/components/AppButton";
import {
  getActivePackage,
  getClientSessions,
  updateSession,
} from "../../../../../src/services/ClientService";
import { colors } from "../../../../../src/theme/colors";
import {
  Exercise,
  ExerciseSet,
  SessionExercise,
  SessionWithId,
} from "../../../../../src/types/models";

/* ------------------ DATE HELPERS ------------------ */

const formatDateKey = (date: Date) => date.toISOString().split("T")[0]; // YYYY-MM-DD

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
  const { id, date, packageId, attendance } = useLocalSearchParams<{
    id: string;
    date: string;
    packageId: string;
    attendance: "attended" | "no_show" | "charged-no-show";
  }>();
  const params = useLocalSearchParams();
  const clientId = typeof params.id === "string" ? params.id : params.id?.[0];

  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  

  /* ------------------ LOAD SESSIONS ------------------ */
  



 
  const isToday = (dateKey: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateKey === today;
  };
 

  const [activePackage, setActivePackage] = useState<{
    id: string;
    sessionsRemaining: number;
  } | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const load = async () => {
      const [sessionsData, pkg] = await Promise.all([
        getClientSessions(clientId),
        getActivePackage(clientId),
      ]);
      log("loaded sessions", sessionsData);
      log("loaded package", pkg);

      setSessions(sessionsData);

      setActivePackage(
        pkg && pkg.id
          ? { id: pkg.id, sessionsRemaining: pkg.sessionsRemaining }
          : null
      );
      log("active package", pkg);
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
  const existing = sessions.find((s) => s.date === dateKey);

  if (!existing) {
    Alert.alert(
      "No session",
      "Sessions can only be edited after being created from the trainer schedule."
    );
    return;
  }

  router.push({
    pathname: "/(app)/trainer/client/[id]/exercises",
    params: {
      id: clientId,
      sessionId: existing.id,
      date: dateKey,
    },
  });
};

  /* ------------------ EXERCISES ------------------ */

  /* ------------------ RENDER ------------------ */

  const getAttendanceBorderColor = (attendance?: string) => {
    log("attendance: ", attendance);
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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.weekHeader}>
        <Pressable onPress={() => changeWeek(-1)}>
          <Text style={[typography.heading, { color: colors.primary }]}>‹</Text>
        </Pressable>

        <Text style={[typography.heading, { color: colors.textPrimary }]}>
          {activeDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </Text>

        <Pressable onPress={() => changeWeek(1)}>
          <Text style={[typography.heading, { color: colors.primary }]}>›</Text>
        </Pressable>
      </View>

      {/* WEEK GRID */}
      <View style={styles.calendarCenter}>
        <View style={styles.weekGrid}>
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            const session = sessions.find((s) => s.date === key);

            const hasSession = !!session;
            const attendance = session?.attendance;

            const borderColor = hasSession
              ? getAttendanceBorderColor(attendance)
              : "transparent";

            const isClickable =
              attendance === "confirmed" || attendance === "attended";

            return (
              <Pressable
                key={key}
                disabled={!isClickable}
                onPress={() => isClickable && onDayPress(key)}
                style={[
                  styles.dayCard,
                  !hasSession && styles.dayDisabled,

                  // Attendance border
                  hasSession && {
                    borderWidth: 2,
                    borderColor,
                  },

                  // 🔥 TODAY → dashed border
                  isToday(key) && {
                    borderStyle: "dashed",
                  },
                ]}
              >
                <Text
                  style={[typography.small, { color: colors.textSecondary }]}
                >
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </Text>
                <Text
                  style={[typography.heading, { color: colors.textPrimary }]}
                >
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
      </View>
  )}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  calendarCenter: {
    flex: 1,
    justifyContent: "center", // vertical center only
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  nav: {
    color: colors.primary,
  },
  monthTitle: {
    color: colors.textPrimary,
  },
  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // 3 cards per row
    alignItems: "center",
    width: "100%",
    gap: 8,
  },

  dayCard: {
    width: "30%",
    minHeight: 170,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 8,
    marginBottom: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionIndicator: {
    width: 28,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  weekDay: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dayNumber: {
    color: colors.textPrimary,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 30,
    paddingTop:20,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  setsinput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 15,
    borderColor: colors.border,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 15,
    borderColor: colors.border,
    borderWidth: 1,
  },
  delete: {
    color: "#ef4444",
    marginTop: 8,
    textAlign: "right",
  },
  today: {
    borderWidth: 2,
    borderColor: colors.primary, // 🔴 red
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  exerciseModal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
  },

  exerciseOption: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exerciseOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "#1a0f12", // subtle red-tinted dark
  },

  exerciseOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  dropdown: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 20,
  },

  dropdownContainer: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
  },

  dropdownText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  inputsGroup: {
    gap: 14, // 🔥 fixes squashed inputs
    marginBottom: 20,
  },
  setCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  setTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 6,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  editBtn: {
    color: colors.primary,
    fontWeight: "700",
  },

  editRow: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 10,
  },

  saveBtn: {
    color: colors.primary,
    fontWeight: "700",
  },

  cancelBtn: {
    color: "#ef4444",
    fontWeight: "600",
  },
  readonlyGroup: {
    gap: 10,
  },

  readonlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
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
  exerciseActions: {
    flexDirection: "row",
    gap: 16,
  },

  deleteBtn: {
    color: "#ef4444",
    fontWeight: "600",
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchResults: {
    maxHeight: 220,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
  },
  setsContainer: {
    width: "100%",
    marginTop: 8,
    gap: 10,
  },
});
