import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import AppButton from "../../../../src/components/AppButton";
import {
  getActivePackage,
  getClientSessions,
  updateSession,
} from "../../../../src/services/ClientService";
import { colors } from "../../../../src/theme/colors";
import { SessionExercise, SessionWithId } from "../../../../src/types/models";

/* ------------------ CONSTANTS ------------------ */

const EXERCISES = [
  { id: 1, name: "Squat" },
  { id: 2, name: "Bench Press" },
  { id: 3, name: "Deadlift" },
  { id: 4, name: "Overhead Press" },
];

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
    attendance: "attended" | "no_show" | "charged_no_show";
  }>();
  const canEditWorkout = attendance === "attended";
  const params = useLocalSearchParams();
  const clientId = typeof params.id === "string" ? params.id : params.id?.[0];

  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [activeDate, setActiveDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionWithId | null>(
    null
  );
  const [draftExercises, setDraftExercises] = useState<SessionExercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  /* ------------------ LOAD SESSIONS ------------------ */
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    null
  );
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const [exerciseOpen, setExerciseOpen] = useState(false);

  const [activePackage, setActivePackage] = useState<{
    id: string;
    sessionsRemaining: number;
  } | null>(null);

  const exerciseItems = EXERCISES.map((ex) => ({
    label: ex.name,
    value: ex.id,
  }));

  useEffect(() => {
    if (!clientId) return;

    const load = async () => {
      const [sessionsData, pkg] = await Promise.all([
        getClientSessions(clientId),
        getActivePackage(clientId),
      ]);
      console.log("loaded sessions", sessionsData);
      console.log("loaded package", pkg);

      setSessions(sessionsData);

      setActivePackage(
        pkg && pkg.id
          ? { id: pkg.id, sessionsRemaining: pkg.sessionsRemaining }
          : null
      );
      console.log("active package", pkg);
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

    // 🚫 NO MANUAL CREATION
    if (!existing) {
      Alert.alert(
        "No session",
        "Sessions can only be edited after being created from the trainer schedule."
      );
      return;
    }

    setSelectedDate(dateKey);
    setCurrentSession(existing);
    setDraftExercises(existing.exercises);
    setModalVisible(true);
  };

  /* ------------------ EXERCISES ------------------ */

  const openAddExercise = () => {
    setSelectedExerciseId(null);
    setSets("");
    setReps("");
    setWeightKg("");
    setExerciseModalVisible(true);
  };

  const confirmAddExercise = () => {
    if (!selectedExerciseId || !sets || !reps || !weightKg) {
      if (Platform.OS === "web") {
        if (window.confirm("Missing fields. Fill all exercise fields")) return;
      } else {
        Alert.alert("Missing fields", "Fill all exercise fields");
        return;
      }
    }

    const exercise = EXERCISES.find((e) => e.id === selectedExerciseId);
    if (!exercise) return;

    setDraftExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        name: exercise.name,
        sets: Number(sets),
        reps: Number(reps),
        weightKg: Number(weightKg),
      },
    ]);

    setExerciseModalVisible(false);
  };

  const updateExercise = (
    index: number,
    field: keyof SessionExercise,
    value: number
  ) => {
    setDraftExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const deleteExercise = (index: number) => {
    setDraftExercises((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------ SAVE SESSION ------------------ */

  const saveSession = async () => {
    if (!clientId || !currentSession || !selectedDate) return;

    await updateSession(clientId, currentSession.id, {
      date: selectedDate,
      exercises: draftExercises,
      packageId: currentSession.packageId,
    });

    const updatedSessions = await getClientSessions(clientId);
    setSessions(updatedSessions);

    setModalVisible(false);
    setCurrentSession(null);
    setDraftExercises([]);
  };

  /* ------------------ DELETE SESSION ------------------ */

  /* ------------------ CANCEL ------------------ */

  const cancel = () => {
    setModalVisible(false);
    setCurrentSession(null);
    setDraftExercises([]);
    setSelectedDate(null);
  };

  /* ------------------ RENDER ------------------ */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.weekHeader}>
        <Pressable onPress={() => changeWeek(-1)}>
          <Text style={styles.nav}> ‹ </Text>
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
      {/* WEEK CALENDAR */}
      <View style={styles.calendarCenter}>
        <View style={styles.weekGrid}>
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            const hasSession = sessions.some((s) => s.date === key);
            const isSelected = key === selectedDate;
            const isToday = key === formatDateKey(new Date());

            return (
              <Pressable
                key={key}
                disabled={!hasSession}
                onPress={() => onDayPress(key)}
                style={[
                  styles.dayCard,
                  isSelected && styles.selectedDay,
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

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <Pressable onPress={cancel}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <Text style={styles.modalTitle}>Edit Session • {selectedDate}</Text>

          <ScrollView>
            {draftExercises.map((ex, i) => (
              <View key={i} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{ex.name}</Text>

                <View style={styles.row}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Sets"
                    placeholderTextColor={colors.textSecondary}
                    value={String(ex.sets)}
                    onChangeText={(v) => updateExercise(i, "sets", Number(v))}
                  />
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Reps"
                    placeholderTextColor={colors.textSecondary}
                    value={String(ex.reps)}
                    onChangeText={(v) => updateExercise(i, "reps", Number(v))}
                  />
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Weight (kg)"
                    placeholderTextColor={colors.textSecondary}
                    value={String(ex.weightKg)}
                    onChangeText={(v) =>
                      updateExercise(i, "weightKg", Number(v))
                    }
                  />
                </View>

                <Pressable onPress={() => deleteExercise(i)}>
                  <Text style={styles.delete}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <AppButton title="Add Exercise" onPress={openAddExercise} />
          <AppButton title="Save Session" onPress={saveSession} />
        </View>
      </Modal>
      <Modal visible={exerciseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.exerciseModal}>
            <Text style={styles.modalTitle}>Add Exercise</Text>

            {/* Exercise selector */}
            <DropDownPicker
              open={exerciseOpen}
              value={selectedExerciseId}
              items={exerciseItems}
              setOpen={setExerciseOpen}
              setValue={setSelectedExerciseId}
              placeholder="Select exercise"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              zIndex={3000}
              zIndexInverse={1000}
            />

            {/* Inputs only after exercise selected */}
            {selectedExerciseId && (
              <View style={styles.inputsGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Sets"
                  placeholderTextColor="#FFFFFF"
                  keyboardType="numeric"
                  value={sets}
                  onChangeText={setSets}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Reps"
                  keyboardType="numeric"
                  placeholderTextColor="#FFFFFF"
                  value={reps}
                  onChangeText={setReps}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Weight (kg)"
                  placeholderTextColor="#FFFFFF"
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                />
              </View>
            )}

            <AppButton title="✔ Add Exercise" onPress={confirmAddExercise} />
            <AppButton
              title="Cancel"
              onPress={() => setExerciseModalVisible(false)}
            />
          </View>
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
    justifyContent: "center", // vertical center only
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
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  selectedDay: {
    backgroundColor: colors.primary,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    color: "#FFFFFF",
    marginBottom: 16,
    borderColor: "red",
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
});
