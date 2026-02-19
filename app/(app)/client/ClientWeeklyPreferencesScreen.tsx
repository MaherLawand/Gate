import auth from "@react-native-firebase/auth";
import { collection, doc } from "@/src/services/db";
import firestore from "@react-native-firebase/firestore"; // keep this only for FieldValue

import { useClient } from "@/src/components/ClientContext";
import WeeklyPreferencesSkeleton from "@/src/components/skeletons/WeeklyPreferences/WeeklyPreferencesSkeleton";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { log, error } from "@/src/utils/logger";

import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Alert,
  Animated,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
/* ------------------ CONFIG ------------------ */

const TRAINING_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`); // 08 → 19

/* ------------------ HELPERS ------------------ */

// Week starts on SATURDAY
function getCurrentWeekKey() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 6 ? 0 : -(day + 1);
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + diff);
  return saturday.toISOString().split("T")[0];
}

/* ------------------ COMPONENT ------------------ */

export default function ClientWeeklyPreferencesScreen() {
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace("/(app)/client/Gate");
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
    // allow programmatic replaces
    if (e.data.action?.type === "REPLACE") return;

    e.preventDefault();
    router.replace("/(app)/client/Gate");
  });

  return unsub;
}, [navigation]);

  const user = auth().currentUser;
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const clientCtx = useClient();
  if (!clientCtx) {
    return null;
  }
  const clientId = clientCtx?.clientId ?? null;
  const clientLoading = clientCtx?.clientloading ?? true;
  const [sessionsPerWeek, setSessionsPerWeek] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [hasActivePackage, setHasActivePackage] = useState(false);
  const weekKey = useMemo(() => getCurrentWeekKey(), []);

  /* ------------------ ANIMATION ------------------ */

  const animatedHeights = useRef<Record<string, Animated.Value>>({}).current;

  const getHeight = (day: string) => {
    if (!animatedHeights[day]) {
      animatedHeights[day] = new Animated.Value(0);
    }
    return animatedHeights[day];
  };

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const isOpen = !!prev[day];

      Animated.timing(getHeight(day), {
        toValue: isOpen ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();

      return {
        ...prev,
        [day]: !isOpen,
      };
    });
  };

  /* ------------------ DERIVED LOGIC ------------------ */

  const selectedDaysCount = Object.keys(preferences).filter(
    (day) => preferences[day]?.length > 0
  ).length;

  const maxDaysReached = selectedDaysCount >= sessionsPerWeek;

  function getDateForWeekday(weekKey: string, dayIndex: number) {
    const base = new Date(weekKey); // Saturday
    const date = new Date(base);

    // Monday starts at +2 from Saturday
    date.setDate(base.getDate() + dayIndex + 2);

    return date.toISOString().split("T")[0];
  }

  /* ------------------ LOAD CLIENT + PACKAGE ------------------ */

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
       log("clientId", clientId);

        const pkgSnap = await collection("clients", clientId || "", "packages")
  .where("status", "==", "active")
  .limit(1)
  .get();

        if (pkgSnap.empty) {
          setHasActivePackage(false);
          setSessionsPerWeek(0);
          setPreferences({});
          return;
        }
        setHasActivePackage(true);
        const pkg = pkgSnap.docs[0].data();

        // ✅ STEP 3 — derive sessions per week
        const derivedSessionsPerWeek = Math.ceil(pkg.totalSessions / (1 * 4));

        setSessionsPerWeek(derivedSessionsPerWeek);

        const prefSnap = await doc(
  "clients",
  clientId || "",
  "weekly_preferences",
  weekKey
).get();

        if (prefSnap.exists()) {
          const data = prefSnap.data();

          if (
            data &&
            typeof data === "object" &&
            data.preferences &&
            typeof data.preferences === "object"
          ) {
            setPreferences(data.preferences as Record<string, string[]>);
          } else {
            setPreferences({});
          }
        } else {
          setPreferences({});
        }
      } catch (e: any) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, weekKey]);

  /* ------------------ TOGGLE TIME (DAY-BASED LOGIC) ------------------ */

  const toggleTime = (dateKey: string, time: string) => {
    setPreferences((prev) => {
      const times = prev[dateKey] ?? [];
      const exists = times.includes(time);

      const updatedTimes = exists
        ? times.filter((t) => t !== time)
        : [...times, time];

      const updated = { ...prev };

      if (updatedTimes.length === 0) {
        delete updated[dateKey];
      } else {
        updated[dateKey] = updatedTimes;
      }

      return updated;
    });
  };


  //check this out later
  // const toggleTime = (dateKey: string, time: string) => {
  //   setPreferences((prev) => {
  //     const times = prev[dateKey] ?? [];
  //     const exists = times.includes(time);
  
  //     const updatedTimes = exists
  //       ? times.filter((t) => t !== time)
  //       : [...times, time];
  
  //     const updated = { ...prev };
  
  //     if (updatedTimes.length === 0) {
  //       delete updated[dateKey];
  //     } else {
  //       updated[dateKey] = updatedTimes;
  //     }
  
  //     return updated;
  //   });
  
  //   // auto-expand day
  //   setExpandedDays((prev) => ({ ...prev, [dateKey]: true }));
  // };

  /* ------------------ SAVE ------------------ */

  const handleSave = async () => {
    if (!clientId) return;

    await doc(
  "clients",
  clientId,
  "weekly_preferences",
  weekKey
).set({
        weekKey,
        preferences,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    Alert.alert("Saved", "Your preferences were saved for this week");
  };

  /* ------------------ UI ------------------ */

  if (loading) {
    return <WeeklyPreferencesSkeleton />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>
        Weekly Training Preferences
      </Text>
      <Text
        style={[
          typography.bodyMedium,
          { color: colors.textSecondary, marginBottom: 12 },
        ]}
      >
        Week starting Saturday: {weekKey}
      </Text>

      <Text
        style={[
          typography.bodyMedium,
          { color: colors.primary, marginBottom: 16 },
        ]}
      >
        Training days allowed: {sessionsPerWeek}
      </Text>

      {TRAINING_DAYS.map((day, index) => {
        const dateKeyForDay = getDateForWeekday(weekKey, index);
       log("dateKeyForDay ", dateKeyForDay);
        const selectedTimes = preferences[dateKeyForDay] ?? [];
       log("preferences ", preferences);
       log("selectedTimes ", selectedTimes);

        const isActive = selectedTimes.length > 0;
       log("isActive ", isActive);

        const disabled = !isActive && maxDaysReached;

        const heightAnim = getHeight(day.key);
        const height = heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 120],
        });

        return (
          <View key={day.key} style={styles.dayCard}>
            <TouchableOpacity
              disabled={disabled}
              onPress={() => toggleDay(day.key)}
              style={[styles.dayHeader, disabled && styles.dayDisabled]}
            >
              <Text
                style={[typography.bodyMedium, { color: colors.textPrimary }]}
              >
                {day.label}
              </Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>
                {isActive ? "Selected" : "Tap to choose"}
              </Text>
            </TouchableOpacity>

            <Animated.View style={{ height, overflow: "hidden" }}>
              <View style={styles.hoursRow}>
                {HOURS.map((hour) => {
                  const selected = selectedTimes.includes(hour);

                  return (
                    <TouchableOpacity
                      key={hour}
                      onPress={() => toggleTime(dateKeyForDay, hour)}
                      style={[styles.hourBtn, selected && styles.hourSelected]}
                    >
                      <Text
                        style={[
                          typography.small,
                          styles.hourText,
                          selected && styles.hourTextSelected,
                        ]}
                      >
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.saveBtn, !hasActivePackage && styles.saveBtnDisabled]}
        disabled={!hasActivePackage}
        onPress={handleSave}
      >
        <Text
          style={[
            typography.button,
            styles.saveText,
            !hasActivePackage && styles.saveTextDisabled,
          ]}
        >
          Save Preferences
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: colors.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 12,
  },
  info: {
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dayHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  dayDisabled: {
    opacity: 0.4,
  },
  hoursRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  hourBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hourSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hourText: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  hourTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
  saveBtnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },

  saveTextDisabled: {
    color: colors.textSecondary,
  },
});
