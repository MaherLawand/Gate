import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Exercise, ExerciseSet, SessionExercise } from "@/src/types/models";
import { getExercises } from "@/src/services/ExerciseService";
import { SessionWithId } from "@/src/types/models";
import { getClientSessions, updateSession } from "@/src/services/ClientService";
import AppButton from "@/src/components/AppButton";
import ActionSheet, {
  ActionSheetRef,
  ScrollView as SheetScrollView,
} from "react-native-actions-sheet";
import { useRef } from "react";
import { StyleSheet } from "react-native";
import React from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { log, error } from "@/src/utils/logger";
import { BlurView } from "expo-blur";
import {
  BottomSheetModalProvider,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { root } from "@/src/services/db";
import AnimatedAppear from "@/src/components/AnimatedAppear";

const AddExerciseSheet = React.memo(
  ({
    search,
    onSearchChange,
    filteredExercises,
    selectedExerciseId,
    setSelectedExerciseId,
    setSearch,
    setFilteredExercises,
    setSetInputs,
    onChangeSetCount,
    setInputsArray,
    confirmAddExercise,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    onCreateCustomExercise, // 👈 REQUIRED FROM PARENT
    colors,
    typography,
    styles,
    isSubmitting,
    setIsSubmitting,
  }: any) => {
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customName, setCustomName] = useState("");
    const [customCategory, setCustomCategory] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const categories = [
      "chest",
      "biceps",
      "triceps",
      "shoulders",
      "quadriceps",
      "hamstrings",
      "calves",
      "glutes",
      "abdominals",
      "lats",
      "middle_back",
      "lower_back",
      "traps",
      "forearms",
      "abductors",
      "adductors",
    ];

    const resetCustomForm = () => {
      setCustomName("");
      setCustomCategory(null);
      setShowCustomForm(false);
    };

    const handleCreateExercise = async () => {
      if (!customName.trim() || !customCategory) {
        Alert.alert("Fill all fields");
        return;
      }

      try {
        setIsCreating(true);

        const created = await onCreateCustomExercise(
          customName.trim(),
          customCategory,
        );

        if (!created) return;

        // auto select
        setSelectedExerciseId(created.id);
        setSearch(created.name);
        setFilteredExercises([]);
        setHasUnsavedChanges(true);

        resetCustomForm();
      } catch (e) {
        Alert.alert("Error", "Failed to create exercise");
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <View style={styles.sheetContainer}>
        {/* HEADER */}
        <View style={styles.sheetHeader}>
          <Text style={[typography.heading, { color: colors.textPrimary }]}>
            Add Exercise
          </Text>

          <Pressable onPress={() => setShowCustomForm((prev) => !prev)}>
            <Text style={{ fontSize: 22, color: colors.primary }}>
              {showCustomForm ? "✕" : "＋"}
            </Text>
          </Pressable>
        </View>

        {/* CUSTOM FORM */}
        {showCustomForm && (
          <View style={{ marginBottom: 20 }}>
            <BottomSheetTextInput
              style={[typography.body, styles.searchInput]}
              placeholder="Exercise name"
              value={customName}
              onChangeText={setCustomName}
            />

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 10,
              }}
            >
              {categories.map((cat) => {
                const selected = customCategory === cat;

                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCustomCategory(cat)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected
                        ? colors.primary
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#fff" : colors.textPrimary,
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {cat.replace("_", " ")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <AppButton
              title={isCreating ? "Creating..." : "Create Exercise"}
              onPress={handleCreateExercise}
              disabled={isCreating}
              style={{ marginTop: 15 }}
            />
          </View>
        )}

        {/* MAIN FORM (DISABLED WHEN CUSTOM FORM OPEN) */}
        <View
          style={{
            opacity: showCustomForm ? 0.4 : 1,
          }}
          pointerEvents={showCustomForm ? "none" : "auto"}
        >
          {/* SEARCH */}
          <BottomSheetTextInput
            style={[typography.body, styles.searchInput]}
            placeholder="Search exercise..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={onSearchChange}
          />

          {/* SEARCH RESULTS */}
          {search.length > 0 && filteredExercises.length > 0 && (
            <View style={styles.searchResultsWrapper}>
              {filteredExercises.map((ex: any) => (
                <Pressable
                  key={ex.id}
                  style={styles.exerciseOption}
                  onPress={() => {
                    setSelectedExerciseId(ex.id);
                    setSearch(ex.name);
                    setFilteredExercises([]);
                    setHasUnsavedChanges(true);
                  }}
                >
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {ex.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* SETS SECTION */}
          {selectedExerciseId && (
            <View style={styles.setsSection}>
              <BottomSheetTextInput
                placeholderTextColor={colors.textSecondary}
                style={[typography.body, styles.searchInput]}
                placeholder="Number of sets"
                keyboardType="numeric"
                onChangeText={(text) => {
                  setHasUnsavedChanges(true);
                  onChangeSetCount(text);
                }}
              />

              <View style={styles.setInputsWrapper}>
                {setInputsArray.map((set: any, index: number) => (
                  <View key={index} style={styles.setCard}>
                    <Text
                      style={[
                        typography.small,
                        {
                          color: colors.textSecondary,
                          marginBottom: 8,
                        },
                      ]}
                    >
                      Set {index + 1}
                    </Text>

                    <View style={styles.row}>
                      <BottomSheetTextInput
                        placeholderTextColor={colors.textSecondary}
                        style={[typography.body, styles.input]}
                        placeholder="Reps"
                        keyboardType="numeric"
                        onChangeText={(v) => {
                          setHasUnsavedChanges(true);
                          setSetInputs((prev: any) =>
                            prev.map((s: any, i: number) =>
                              i === index ? { ...s, reps: Number(v) } : s,
                            ),
                          );
                        }}
                      />

                      <BottomSheetTextInput
                        placeholderTextColor={colors.textSecondary}
                        style={[typography.body, styles.input]}
                        placeholder="kg"
                        keyboardType="numeric"
                        onChangeText={(v) => {
                          setHasUnsavedChanges(true);
                          setSetInputs((prev: any) =>
                            prev.map((s: any, i: number) =>
                              i === index ? { ...s, weightKg: Number(v) } : s,
                            ),
                          );
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ADD BUTTON */}
          <View style={{ marginTop: 28 }}>
            <AppButton
              title={isSubmitting ? "Adding..." : "Add Exercise"}
              onPress={confirmAddExercise}
              disabled={isSubmitting}
            />
          </View>
        </View>
      </View>
    );
  },
);

export default function ClientExercisesScreen() {
  const { id, sessionId, date } = useLocalSearchParams<{
    id: string;
    sessionId: string;
    date: string;
  }>();
  const clientId = id;

  const [hasSessionUnsavedChanges, setHasSessionUnsavedChanges] =
    useState(false);
  const navigation = useNavigation();

  usePreventRemove(hasSessionUnsavedChanges, ({ data }) => {
    Alert.alert(
      "Discard changes?",
      "If you leave now, your session changes will be lost.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            navigation.dispatch(data.action);
          },
        },
      ],
    );
  });

  const [session, setSession] = useState<SessionWithId | null>(null);
  const allowCloseRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useEffect(() => {
    const loadSession = async () => {
      if (!clientId || !sessionId) return;

      try {
        setIsLoading(true);

        const sessions = await getClientSessions(clientId);
        const current = sessions.find((s) => s.id === sessionId);

        if (!current) {
          Alert.alert("Error", "Session not found");
          router.back();
          return;
        }

        setSession(current);
        setDraftExercises(
          current.exercises
            ? JSON.parse(JSON.stringify(current.exercises))
            : [],
        );
      } catch (e) {
        error(e);
        Alert.alert("Error", "Failed to load session");
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [clientId, sessionId]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<
    number | null
  >(null);
  const [draftExercises, setDraftExercises] = useState<SessionExercise[]>([]);
  const sheetRef = useRef<ActionSheetRef>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const isProgrammaticClose = useRef(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [setInputs, setSetInputs] = useState<ExerciseSet[]>([]);
  const [setCountInput, setSetCountInput] = useState("0");
  const [setCount, setSetCount] = useState(0);

  const [search, setSearch] = useState<string>(""); // 👈 must be ""
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSetCountChange = (count: number) => {
    setSetCount(count);

    setSetInputs(
      Array.from({ length: count }, () => ({
        reps: 0,
        weightKg: 0,
      })),
    );
  };
  const onChangeSetCount = useCallback((text: string) => {
    setHasUnsavedChanges(true);
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
  }, []);

  const snapPoints = useMemo(() => {
    const hasSets = setInputs.length > 0;
    console.log(setInputs)
    console.log("hasSets: " ,hasSets)
    if (hasSets) return ["55%"];       // Full form visible
    return ["40%"];                    // Just search input
  }, [filteredExercises.length, setInputs.length]);
  // const snapPoints = useMemo(() => {
  //   if (setInputs.length > 0) return [500]; // px
  //   return [350];
  // }, [setInputs.length]);

  useEffect(() => {
    const loadExercises = async () => {
      const data = await getExercises();
      log("data: ", data);
      setAllExercises(data);
      setFilteredExercises(data);
    };

    loadExercises();
  }, []);

  const onSearchChange = useCallback(
    (text: string) => {
      log("innnn");
      log("search text: ", text);
      setSearch(text);

      const query = text.trim().toLowerCase();
      log("normalized query: ", query);
      if (!query) {
        log("empty query, showing all exercises");
        setFilteredExercises([]);
        return;
      }

      const results = allExercises
        .map((ex) => {
          const keywords = ex.searchKeywords || [];

          let score = 0;

          // Strong match: name starts with query
          if (ex.name.toLowerCase().startsWith(query)) score += 3;

          // Medium match: name contains query
          if (ex.name.toLowerCase().includes(query)) score += 2;

          // Keyword match
          if (keywords.some((k: string) => k.includes(query))) score += 1;

          return { exercise: ex, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.exercise)
        .slice(0, 20); // limit results
      console.log("filtered exercises: ", results);
      setFilteredExercises(results);
    },
    [allExercises],
  );

  const openAddExercise = () => {
    setSelectedExerciseId(null);
    setSetCount(0);
    setSetInputs([]);
    setSearch("");
    setHasUnsavedChanges(false);
    bottomSheetRef.current?.present();
  };

  const confirmAddExercise = useCallback(() => {
    if (isSubmitting) return; // 🛑 block double tap

    if (!selectedExerciseId || setInputs.length === 0) {
      Alert.alert("Missing data", "Select exercise and sets");
      return;
    }

    const hasInvalidSet = setInputs.some((s) => s.reps <= 0 || s.weightKg <= 0);

    if (hasInvalidSet) {
      Alert.alert(
        "Invalid sets",
        "Each set must have reps and weight greater than 0",
      );
      return;
    }

    const exercise = allExercises.find((e) => e.id === selectedExerciseId);
    if (!exercise) return;

    setIsSubmitting(true); // 🔒 lock

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
    allowCloseRef.current = true;
    setHasUnsavedChanges(false);
    setHasSessionUnsavedChanges(true);
    isProgrammaticClose.current = true;
    bottomSheetRef.current?.dismiss();

    setIsSubmitting(false); // 🔓 unlock
  }, [selectedExerciseId, setInputs, allExercises, isSubmitting]);

  const updateExercise = (
    index: number,
    field: keyof SessionExercise,
    value: number,
  ) => {
    setDraftExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  };

  const deleteExercise = (index: number) => {
    setDraftExercises((prev) => prev.filter((_, i) => i !== index));
    setHasSessionUnsavedChanges(true);
  };

  /* ------------------ SAVE SESSION ------------------ */

  const saveSession = async () => {
    if (!clientId || !session || isSubmitting) return;

    try {
      setIsSubmitting(true); // 🔒 lock

      await updateSession(clientId, session.id, {
        date: session.date,
        exercises: draftExercises,
        packageId: session.packageId,
        attendance: session.attendance,
      });

      Alert.alert("Success", "Session updated");
      setHasSessionUnsavedChanges(false);
      router.back();
    } catch (e) {
      error(e);
      Alert.alert("Error", "Failed to save session");
    } finally {
      setIsSubmitting(false); // 🔓 always unlock
    }
  };

  const resetAddExerciseState = () => {
    setSelectedExerciseId(null);
    setSetInputs([]);
    setSetCount(0);
    setSetCountInput("");
    setSearch("");
    setFilteredExercises([]);
    setHasUnsavedChanges(false);
  };

  const createCustomExercise = async (
    name: string,
    category: string,
  ): Promise<Exercise | null> => {
    try {
      const normalizedName = name.trim().toLowerCase();
      const id = normalizedName.replace(/\s+/g, "_");

      // 🔎 Prevent duplicates
      const existing = allExercises.find((e) => e.id === id);
      if (existing) {
        return existing;
      }

      // 🔤 Generate search keywords
      const nameWords = normalizedName
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9_]/g, ""))
        .filter(Boolean);

      const searchKeywords = Array.from(
        new Set([...nameWords, normalizedName, category.toLowerCase()]),
      );

      const newExercise: Exercise = {
        id,
        name: name.trim(),
        category,
        muscleGroups: [category],
        equipment: "",
        difficulty: "intermediate",
        searchKeywords,
        isActive: true,
      };

      // 💾 Save to Firestore
      await root().collection("Exercises").doc(id).set(newExercise);

      // 🔄 Refetch exercises
      setAllExercises((prev) => [...prev, newExercise]);

      return newExercise;
    } catch (err) {
      console.error("Create custom exercise failed:", err);
      Alert.alert("Error", "Failed to create exercise");
      return null;
    }
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modal}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 20,
            }}
          >
            {isLoading ? (
              <AnimatedAppear delay={60} style={{ width: "100%" }}>
                <View style={styles.loadingState}>
                  <Text
                    style={[typography.body, { color: colors.textSecondary }]}
                  >
                    Loading session...
                  </Text>
                </View>
              </AnimatedAppear>
            ) : draftExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[typography.body, styles.emptySubtitle]}>
                  This session doesn’t have any exercises assigned. Add one to
                  start building the workout.
                </Text>
              </View>
            ) : (
              draftExercises.map((ex, exIndex) => {
                const isEditing = editingExerciseIndex === exIndex;

                return (
                  <AnimatedAppear
                    key={exIndex}
                    delay={exIndex * 60}
                    style={{ width: "100%" }} // 🔥 IMPORTANT
                  >
                    <View key={exIndex} style={styles.exerciseCard}>
                      {/* HEADER */}
                      <View style={styles.exerciseHeader}>
                        <Text
                          numberOfLines={2}
                          style={[
                            typography.title,
                            {
                              color: colors.textPrimary,
                              flex: 1, // 👈 takes available space
                              flexShrink: 1, // 👈 allows wrapping instead of pushing
                              marginRight: 8, // 👈 space before buttons
                            },
                          ]}
                        >
                          {ex.name}
                        </Text>

                        {!isEditing && (
                          <View style={styles.exerciseActions}>
                            <Pressable
                              onPress={() => setEditingExerciseIndex(exIndex)}
                            >
                              <Text
                                style={[
                                  typography.small,
                                  { color: colors.primary },
                                ]}
                              >
                                Edit
                              </Text>
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
                                      onPress: () => deleteExercise(exIndex),
                                    },
                                  ],
                                )
                              }
                            >
                              <Text
                                style={[typography.small, { color: "#ef4444" }]}
                              >
                                Delete
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>

                      {/* VIEW MODE */}
                      {!isEditing && (
                        <View style={styles.readonlyGroup}>
                          {ex.sets.map((set, setIndex) => (
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
                          ))}
                        </View>
                      )}

                      {/* EDIT MODE */}
                      {isEditing && (
                        <View style={{ gap: 12 }}>
                          {ex.sets.map((set, setIndex) => (
                            <View key={setIndex} style={styles.editRow}>
                              <Text
                                style={[
                                  typography.small,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Set {setIndex + 1}
                              </Text>

                              <View style={styles.row}>
                                <TextInput
                                  value={String(set.reps)}
                                  placeholderTextColor={colors.textSecondary}
                                  style={[typography.body, styles.input]}
                                  keyboardType="numeric"
                                  placeholder="Reps"
                                  onChangeText={(v) => {
                                    setHasUnsavedChanges(true);
                                    setHasSessionUnsavedChanges(true);
                                    setDraftExercises((prev) =>
                                      prev.map((exercise, i) =>
                                        i === exIndex
                                          ? {
                                              ...exercise,
                                              sets: exercise.sets.map(
                                                (s, si) =>
                                                  si === setIndex
                                                    ? { ...s, reps: Number(v) }
                                                    : s,
                                              ),
                                            }
                                          : exercise,
                                      ),
                                    );
                                  }}
                                />

                                <TextInput
                                  value={String(set.weightKg)}
                                  placeholderTextColor={colors.textSecondary}
                                  style={[typography.body, styles.input]}
                                  keyboardType="numeric"
                                  placeholder="kg"
                                  onChangeText={(v) => {
                                    setHasUnsavedChanges(true);
                                    setHasSessionUnsavedChanges(true);
                                    setDraftExercises((prev) =>
                                      prev.map((exercise, i) =>
                                        i === exIndex
                                          ? {
                                              ...exercise,
                                              sets: exercise.sets.map(
                                                (s, si) =>
                                                  si === setIndex
                                                    ? {
                                                        ...s,
                                                        weightKg: Number(v),
                                                      }
                                                    : s,
                                              ),
                                            }
                                          : exercise,
                                      ),
                                    );
                                  }}
                                />
                              </View>
                            </View>
                          ))}

                          <View style={styles.editActions}>
                            <Pressable
                              onPress={() => setEditingExerciseIndex(null)}
                            >
                              <Text style={[typography.button, styles.saveBtn]}>
                                Save
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => setEditingExerciseIndex(null)}
                            >
                              <Text
                                style={[typography.button, styles.cancelBtn]}
                              >
                                Cancel
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  </AnimatedAppear>
                );
              })
            )}
          </ScrollView>

          <AppButton title="Add Exercise" onPress={openAddExercise} />
          <AppButton
            title={isSubmitting ? "Saving..." : "Save Session"}
            onPress={saveSession}
            disabled={isSubmitting}
          />
        </View>
      </SafeAreaView>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints} // 🔥 USE NUMBER, NOT %
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        //android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor: "rgba(20,20,20,0.95)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.primary,
        }}
        onDismiss={() => {
          if (isProgrammaticClose.current) {
            isProgrammaticClose.current = false;
            return;
          }

          if (hasUnsavedChanges) {
            Alert.alert(
              "Discard changes?",
              "If you leave now, your changes will be lost.",
              [
                {
                  text: "Stay",
                  style: "cancel",
                  onPress: () => bottomSheetRef.current?.present(),
                },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => {
                    resetAddExerciseState();
                  },
                },
              ],
            );
          }
        }}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }} // 🔥 IMPORTANT
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <AddExerciseSheet
            search={search}
            onSearchChange={onSearchChange}
            filteredExercises={filteredExercises}
            selectedExerciseId={selectedExerciseId}
            setSelectedExerciseId={setSelectedExerciseId}
            setSearch={setSearch}
            setFilteredExercises={setFilteredExercises}
            setSetInputs={setSetInputs}
            setCountInput={setSetCountInput}
            onChangeSetCount={onChangeSetCount}
            setInputsArray={setInputs}
            confirmAddExercise={() => {
              confirmAddExercise();
              bottomSheetRef.current?.dismiss();
            }}
            onCreateCustomExercise={createCustomExercise}
            hasUnsavedChanges={hasUnsavedChanges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            colors={colors}
            typography={typography}
            styles={styles}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ---------- SCREEN LAYOUT ---------- */

  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 10,
  },

  /* ---------- EXERCISE CARD ---------- */

  exerciseCard: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0, // 👈 prevents shrinking
    gap: 18,
  },

  /* ---------- READ MODE ---------- */

  readonlyGroup: {
    gap: 10,
  },

  readonlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  /* ---------- EDIT MODE ---------- */

  editRow: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },

  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 14,
  },

  saveBtn: {
    color: colors.primary,
    fontWeight: "700",
  },

  cancelBtn: {
    color: "#ef4444",
    fontWeight: "600",
  },

  /* ---------- INPUTS ---------- */

  row: {
    flexDirection: "row",
    gap: 14,
  },

  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* ---------- ADD EXERCISE MODAL ---------- */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  exerciseModal: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exerciseOption: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchResults: {
    maxHeight: 220,
    marginBottom: 14,
  },

  setsContainer: {
    marginTop: 12,
    gap: 12,
  },
  /* ---------- EMPTY STATE ---------- */

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 60,
  },

  emptyTitle: {
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },

  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sheetContainer: {
    paddingBottom: 20,
  },

  searchResultsWrapper: {
    marginBottom: 18,
  },

  setsSection: {
    marginTop: 10,
  },

  setInputsWrapper: {
    marginTop: 16,
    gap: 18, // 🔥 more space between sets
  },

  setCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 18,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
});
