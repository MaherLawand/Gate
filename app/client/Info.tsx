import { useClient } from "@/src/components/ClientContext";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getActivePackage,
  getClientSessions,
} from "../../src/services/ClientService";
import { colors } from "../../src/theme/colors";
import { SessionWithId } from "../../src/types/models";

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
  const params = useLocalSearchParams();
  const { clientId, clientloading } = useClient();

  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionWithId | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);

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

    if (!session) {
      Alert.alert("No session", "No session on this day.");
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

  /* ------------------ RENDER ------------------ */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.weekHeader}>
        <Pressable onPress={() => changeWeek(-1)}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>

        <Text style={styles.monthTitle}>
          {activeDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </Text>

        <Pressable onPress={() => changeWeek(1)}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      {/* WEEK CALENDAR */}
      <View style={styles.calendarCenter}>
        <View style={styles.weekGrid}>
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            const hasSession = sessions.some((s) => s.date === key);
            const isToday = key === formatDateKey(new Date());

            return (
              <Pressable
                key={key}
                disabled={!hasSession}
                onPress={() => onDayPress(key)}
                style={[
                  styles.dayCard,
                  hasSession && styles.activeDay,
                  isToday && styles.today,
                ]}
              >
                <Text style={styles.weekDay}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </Text>

                <Text style={styles.dayNumber}>{d.getDate()}</Text>

                {hasSession && <View style={styles.sessionIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SESSION VIEW MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <Pressable onPress={closeModal}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <Text style={styles.modalTitle}>Session • {selectedDate}</Text>

          <ScrollView>
            {currentSession?.exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{ex.name}</Text>

                <View style={styles.readonlyGroup}>
                  {Array.isArray(ex.sets) ? (
                    ex.sets.map((set, setIndex) => (
                      <View key={setIndex} style={styles.readonlyRow}>
                        <Text style={styles.readonlyLabel}>
                          Set {setIndex + 1}
                        </Text>

                        <Text style={styles.readonlyValue}>
                          {set.reps} reps • {set.weightKg} kg
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.readonlyValue}>Invalid set data</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
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
