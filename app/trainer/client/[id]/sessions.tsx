import { getExercises } from "@/src/services/ExerciseService";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import AppButton from "../../../../src/components/AppButton";
import {
  getActivePackage,
  getClientSessions,
  updateSession,
} from "../../../../src/services/ClientService";
import { colors } from "../../../../src/theme/colors";
import {
  Exercise,
  ExerciseSet,
  SessionExercise,
  SessionWithId,
} from "../../../../src/types/models";

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
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<
    number | null
  >(null);
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

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  const [setCountInput, setSetCountInput] = useState("0");
  const [setCount, setSetCount] = useState(0);

  const [setInputs, setSetInputs] = useState<ExerciseSet[]>([]);
  const handleSetCountChange = (count: number) => {
    setSetCount(count);

    setSetInputs(
      Array.from({ length: count }, () => ({
        reps: 0,
        weightKg: 0,
      }))
    );
  };
  const onChangeSetCount = (text: string) => {
    // allow clearing input
    if (text === "") {
      setSetCountInput("");
      setSetCount(0);
      setSetInputs([]);
      return;
    }

    // digits only
    const numeric = text.replace(/[^0-9]/g, "");
    let count = Number(numeric);

    // clamp min/max
    if (count < 1) count = 1;
    if (count > 5) count = 5;

    setSetCountInput(String(count));
    setSetCount(count);

    setSetInputs((prev) => {
      const next = [...prev];

      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) {
          next.push({ reps: 0, weightKg: 0 });
        }
      } else {
        next.length = count;
      }

      return next;
    });
  };

  const [exerciseOpen, setExerciseOpen] = useState(false);

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

  useEffect(() => {
    const loadExercises = async () => {
      const data = await getExercises();
      console.log("data: ", data);
      setAllExercises(data);
      setFilteredExercises(data);
    };

    loadExercises();
  }, []);

  const [search, setSearch] = useState<string>(""); // 👈 must be ""
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

  const onSearchChange = (text: string) => {
    setSearch(text);

    if (!text.trim()) {
      setFilteredExercises([]);
      return;
    }

    const lower = text.toLowerCase();

    setFilteredExercises(
      allExercises.filter((ex) => ex.name.toLowerCase().includes(lower))
    );
  };

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
    console.log("existing? ", existing);

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
    setSetCount(0);
    setSetInputs([]);
    setExerciseModalVisible(true);
  };

  const confirmAddExercise = () => {
    if (!selectedExerciseId || setInputs.length === 0) {
      Alert.alert("Missing data", "Select exercise and sets");
      return;
    }

    const hasInvalidSet = setInputs.some((s) => s.reps <= 0 || s.weightKg <= 0);

    if (hasInvalidSet) {
      Alert.alert(
        "Invalid sets",
        "Each set must have reps and weight greater than 0"
      );
      return;
    }

    const exercise = allExercises.find((e) => e.id === selectedExerciseId);
    if (!exercise) return;

    setDraftExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        name: exercise.name,
        sets: setInputs,
      },
    ]);

    // reset modal state
    setSelectedExerciseId(null);
    setSetInputs([]);
    setSearch("");

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

      {/* WEEK GRID */}
      <View style={styles.calendarCenter}>
        <View style={styles.weekGrid}>
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            const hasSession = sessions.some((s) => s.date === key);

            return (
              <Pressable
                key={key}
                disabled={!hasSession}
                onPress={() => onDayPress(key)}
                style={styles.dayCard}
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

      {/* SESSION MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <Pressable onPress={cancel}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <ScrollView>
            {draftExercises.map((ex, exIndex) => {
              const isEditing = editingExerciseIndex === exIndex;

              return (
                <View key={exIndex} style={styles.exerciseCard}>
                  {/* HEADER */}
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>

                    {!isEditing && (
                      <View style={styles.exerciseActions}>
                        <Pressable
                          onPress={() => setEditingExerciseIndex(exIndex)}
                        >
                          <Text style={styles.editBtn}>Edit</Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              "Delete exercise",
                              "Are you sure you want to remove this exercise?",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () =>
                                    setDraftExercises((prev) =>
                                      prev.filter((_, i) => i !== exIndex)
                                    ),
                                },
                              ]
                            )
                          }
                        >
                          <Text style={styles.deleteBtn}>Delete</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* VIEW MODE */}
                  {!isEditing && (
                    <View style={styles.readonlyGroup}>
                      {ex.sets.map((set, setIndex) => (
                        <View key={setIndex} style={styles.readonlyRow}>
                          <Text style={styles.readonlyLabel}>
                            Set {setIndex + 1}
                          </Text>
                          <Text style={styles.readonlyValue}>
                            {set.reps} reps • {set.weightKg} kg
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* EDIT MODE */}
                  {isEditing && (
                    <View style={{ gap: 12 }}>
                      {ex.sets.map((set, setIndex) => (
                        <View key={setIndex} style={styles.editRow}>
                          <Text style={styles.setTitle}>
                            Set {setIndex + 1}
                          </Text>

                          <View style={styles.row}>
                            <TextInput
                              placeholderTextColor={colors.textSecondary}
                              style={styles.input}
                              keyboardType="numeric"
                              placeholder="Reps"
                              value={String(set.reps)}
                              onChangeText={(v) =>
                                setDraftExercises((prev) =>
                                  prev.map((exercise, i) =>
                                    i === exIndex
                                      ? {
                                          ...exercise,
                                          sets: exercise.sets.map((s, si) =>
                                            si === setIndex
                                              ? { ...s, reps: Number(v) }
                                              : s
                                          ),
                                        }
                                      : exercise
                                  )
                                )
                              }
                            />

                            <TextInput
                              placeholderTextColor={colors.textSecondary}
                              style={styles.input}
                              keyboardType="numeric"
                              placeholder="kg"
                              value={String(set.weightKg)}
                              onChangeText={(v) =>
                                setDraftExercises((prev) =>
                                  prev.map((exercise, i) =>
                                    i === exIndex
                                      ? {
                                          ...exercise,
                                          sets: exercise.sets.map((s, si) =>
                                            si === setIndex
                                              ? { ...s, weightKg: Number(v) }
                                              : s
                                          ),
                                        }
                                      : exercise
                                  )
                                )
                              }
                            />
                          </View>
                        </View>
                      ))}

                      {/* ACTIONS */}
                      <View style={styles.editActions}>
                        <Pressable
                          onPress={() => setEditingExerciseIndex(null)}
                        >
                          <Text style={styles.saveBtn}>Save</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setEditingExerciseIndex(null)}
                        >
                          <Text style={styles.cancelBtn}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <AppButton title="Add Exercise" onPress={openAddExercise} />
          <AppButton title="Save Session" onPress={saveSession} />
        </View>
      </Modal>

      {/* ADD EXERCISE MODAL */}
      <Modal visible={exerciseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.exerciseModal}>
            <Text style={styles.modalTitle}>Add Exercise</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search exercise..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={onSearchChange}
            />
            {search.length > 0 && filteredExercises.length > 0 && (
              <ScrollView style={styles.searchResults}>
                {filteredExercises.map((ex) => (
                  <Pressable
                    key={ex.id}
                    style={styles.exerciseOption}
                    onPress={() => {
                      setSelectedExerciseId(ex.id);
                      setSearch(ex.name); // ✅ string
                      setFilteredExercises([]); // ✅ array
                    }}
                  >
                    <Text style={styles.exerciseOptionText}>{ex.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {selectedExerciseId && (
              <View style={styles.setsContainer}>
                <TextInput
                  placeholderTextColor={colors.textSecondary}
                  style={styles.setsinput}
                  placeholder="Number of sets"
                  keyboardType="numeric"
                  value={setCountInput}
                  onChangeText={onChangeSetCount}
                />
                <ScrollView style={{ maxHeight: 260 }}>
                  {setInputs.map((set, index) => (
                    <View key={index} style={styles.row}>
                      <TextInput
                        placeholderTextColor={colors.textSecondary}
                        style={styles.input}
                        placeholder={`Set ${index + 1} reps`}
                        keyboardType="numeric"
                        value={String(set.reps)}
                        onChangeText={(v) =>
                          setSetInputs((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, reps: Number(v) } : s
                            )
                          )
                        }
                      />
                      <TextInput
                        placeholderTextColor={colors.textSecondary}
                        style={styles.input}
                        placeholder="kg"
                        keyboardType="numeric"
                        value={String(set.weightKg)}
                        onChangeText={(v) =>
                          setSetInputs((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, weightKg: Number(v) } : s
                            )
                          )
                        }
                      />
                    </View>
                  ))}
                </ScrollView>
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
