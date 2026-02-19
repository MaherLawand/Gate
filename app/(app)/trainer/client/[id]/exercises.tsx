import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from "react-native";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { useCallback, useEffect, useState } from "react";
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
import {
  StyleSheet,
} from "react-native";
import React from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { log, error } from "@/src/utils/logger";

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
    colors,
    typography,
    styles,
  }: any) => {
    return (
      <View style={styles.sheetContainer}>
        {/* HEADER */}
        <Text
          style={[
            typography.heading,
            { color: colors.textPrimary, marginBottom: 18,marginTop:20, },
          ]}
        >
          Add Exercise
        </Text>

        {/* SEARCH */}
        <TextInput
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
        <View
  style={[
    styles.setsSection,
    { opacity: selectedExerciseId ? 1 : 0 },
  ]}
  pointerEvents={selectedExerciseId ? "auto" : "none"}
>
  <TextInput
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
            { color: colors.textSecondary, marginBottom: 8 },
          ]}
        >
          Set {index + 1}
        </Text>

        <View style={styles.row}>
          <TextInput
            placeholderTextColor={colors.textSecondary}
            style={[typography.body, styles.input]}
            placeholder="Reps"
            keyboardType="numeric"
            onChangeText={(v) => {
              setHasUnsavedChanges(true);
              setSetInputs((prev: any) =>
                prev.map((s: any, i: number) =>
                  i === index ? { ...s, reps: Number(v) } : s
                )
              );
            }}
          />

          <TextInput
            placeholderTextColor={colors.textSecondary}
            style={[typography.body, styles.input]}
            placeholder="kg"
            keyboardType="numeric"
            onChangeText={(v) => {
              setHasUnsavedChanges(true);
              setSetInputs((prev: any) =>
                prev.map((s: any, i: number) =>
                  i === index ? { ...s, weightKg: Number(v) } : s
                )
              );
            }}
          />
        </View>
      </View>
    ))}
  </View>
</View>

        {/* BUTTON */}
        <View style={{ marginTop: 28 }}>
          <AppButton title="Add Exercise" onPress={confirmAddExercise} />
        </View>
      </View>
    );
  }
);




export default function ClientExercisesScreen() {
  const { id, sessionId, date } = useLocalSearchParams<{
    id: string;
    sessionId: string;
    date: string;
  }>();
  const clientId = id;

const [hasSessionUnsavedChanges, setHasSessionUnsavedChanges] = useState(false);
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
    ]
  );
});



const [session, setSession] = useState<SessionWithId | null>(null);
const allowCloseRef = useRef(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
useEffect(() => {
  const loadSession = async () => {
    if (!clientId || !sessionId) return;

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
        : []
    );
  };

  loadSession();
}, [clientId, sessionId]);

  const [editingExerciseIndex, setEditingExerciseIndex] = useState<
    number | null
  >(null);
const [draftExercises, setDraftExercises] = useState<SessionExercise[]>([]);
const sheetRef = useRef<React.ElementRef<typeof ActionSheet>>(null);
  
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
      null
    );
    const [allExercises, setAllExercises] = useState<Exercise[]>([]);
     const [setInputs, setSetInputs] = useState<ExerciseSet[]>([]);
       const [setCountInput, setSetCountInput] = useState("0");
  const [setCount, setSetCount] = useState(0);

  const [search, setSearch] = useState<string>(""); // 👈 must be ""
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

   const handleSetCountChange = (count: number) => {
      setSetCount(count);
  
      setSetInputs(
        Array.from({ length: count }, () => ({
          reps: 0,
          weightKg: 0,
        }))
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


    useEffect(() => {
        const loadExercises = async () => {
          const data = await getExercises();
          log("data: ", data);
          setAllExercises(data);
          setFilteredExercises(data);
        };
    
        loadExercises();
      }, []);

const onSearchChange = useCallback((text: string) => {
  setSearch(text);

  if (!text.trim()) {
    setFilteredExercises([]);
    return;
  }

  const lower = text.toLowerCase();

  setFilteredExercises(
    allExercises.filter((ex) =>
      ex.name.toLowerCase().includes(lower)
    )
  );
}, [allExercises]);
    

const openAddExercise = () => {
  setSelectedExerciseId(null);
  setSetCount(0);
  setSetInputs([]);
  setSearch("");
  setHasUnsavedChanges(false);
  sheetRef.current?.show();
};

  const confirmAddExercise = useCallback(() => {

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
    allowCloseRef.current = true;
setHasUnsavedChanges(false);
setHasSessionUnsavedChanges(true);
sheetRef.current?.hide();

  }, [selectedExerciseId, setInputs, allExercises]);

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
    setHasSessionUnsavedChanges(true);
  };

  /* ------------------ SAVE SESSION ------------------ */

 const saveSession = async () => {
  if (!clientId || !session) return;

  try {
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
  {draftExercises.length === 0 ? (
    <View style={styles.emptyState}>
      <Text
        style={[
          typography.body,
          styles.emptySubtitle,
        ]}
      >
        This session doesn’t have any exercises assigned.
        Add one to start building the workout.
      </Text>
    </View>
  ) : (
    draftExercises.map((ex, exIndex) => {
      const isEditing = editingExerciseIndex === exIndex;

      return (
        <View key={exIndex} style={styles.exerciseCard}>
            
            {/* HEADER */}
            <View style={styles.exerciseHeader}>
              <Text
                style={[
                  typography.title,
                  { color: colors.textPrimary }
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
                        { color: colors.primary }
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
                        ]
                      )
                    }
                  >
                    <Text
                      style={[
                        typography.small,
                        { color: "#ef4444" }
                      ]}
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
                        { color: colors.textSecondary }
                      ]}
                    >
                      Set {setIndex + 1}
                    </Text>
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.textPrimary }
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
                        { color: colors.textSecondary }
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
                        onChangeText={(v) =>{
                          setHasUnsavedChanges(true);
                          setHasSessionUnsavedChanges(true);
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
                        }}
                      />

                      <TextInput
                        value={String(set.weightKg)}
                        placeholderTextColor={colors.textSecondary}
                        style={[typography.body, styles.input]}
                        keyboardType="numeric"
                        placeholder="kg"
                        onChangeText={(v) =>{
                            setHasUnsavedChanges(true);
                            setHasSessionUnsavedChanges(true);
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
                    <Text style={[typography.button, styles.cancelBtn]}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      }))}
    </ScrollView>

    <AppButton title="Add Exercise" onPress={openAddExercise} />
    <AppButton title="Save Session" onPress={saveSession} />

  </View>
</SafeAreaView>
<ActionSheet
  ref={sheetRef}
  snapPoints={[85]}   // 85% of screen height
  gestureEnabled
  closeOnTouchBackdrop
  keyboardHandlerEnabled
  indicatorStyle={{ backgroundColor: colors.primary }}
  containerStyle={{
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 15,
    maxHeight: "85%",   // 🔥 THIS FIXES EVERYTHING

  }}
onBeforeClose={() => {
  if (allowCloseRef.current) {
    allowCloseRef.current = false;
    return true;
  }

  if (!hasUnsavedChanges) {
    return true;
  }

  Alert.alert(
    "Discard changes?",
    "If you leave now, your changes will be lost.",
    [
      {
        text: "Stay",
        style: "cancel",
        onPress: () => {
          sheetRef.current?.show();
        },
      },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          allowCloseRef.current = true;
          setHasUnsavedChanges(false);
          sheetRef.current?.hide();
        },
      },
    ]
  );

  return false;
}}
>
  <SheetScrollView
    keyboardShouldPersistTaps="always"
    contentContainerStyle={{
      paddingHorizontal: 20,
      paddingBottom: 40,
    }}
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
      confirmAddExercise={confirmAddExercise}
      hasUnsavedChanges={hasUnsavedChanges}
      setHasUnsavedChanges={setHasUnsavedChanges}
      colors={colors}
      typography={typography}
      styles={styles}
    />
  </SheetScrollView>
</ActionSheet>
</>
  );
}


const styles = StyleSheet.create({
  /* ---------- SCREEN LAYOUT ---------- */

  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding:10,
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
});