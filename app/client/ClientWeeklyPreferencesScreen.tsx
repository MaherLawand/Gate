import { useClient } from "@/src/components/ClientContext";
import { colors } from "@/src/theme/colors";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
  const user = auth().currentUser;
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const { clientId, clientloading } = useClient();
  const [sessionsPerWeek, setSessionsPerWeek] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

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
        console.log("clientId" , clientId);

        const pkgSnap = await firestore()
          .collection("clients")
          .doc(clientId || "")
          .collection("packages")
          .where("status", "==", "active")
          .limit(1)
          .get();

        if (pkgSnap.empty) {
          Alert.alert("No active package");
          return;
        }

        const pkg = pkgSnap.docs[0].data();

        // ✅ STEP 3 — derive sessions per week
        const derivedSessionsPerWeek = Math.ceil(pkg.totalSessions / (1 * 4));

        setSessionsPerWeek(derivedSessionsPerWeek);

        const prefSnap = await firestore()
          .collection("clients")
          .doc(clientId || "")
          .collection("weekly_preferences")
          .doc(weekKey)
          .get();

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

  /* ------------------ SAVE ------------------ */

  const handleSave = async () => {
    if (!clientId) return;

    await firestore()
      .collection("clients")
      .doc(clientId)
      .collection("weekly_preferences")
      .doc(weekKey)
      .set({
        weekKey,
        preferences,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    Alert.alert("Saved", "Your preferences were saved for this week");
  };

  /* ------------------ UI ------------------ */

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Weekly Training Preferences</Text>
      <Text style={styles.subtitle}>Week starting Saturday: {weekKey}</Text>

      <Text style={styles.info}>Training days allowed: {sessionsPerWeek}</Text>

      {TRAINING_DAYS.map((day, index) => {
        const dateKeyForDay = getDateForWeekday(weekKey, index);
        console.log("dateKeyForDay ", dateKeyForDay);
        const selectedTimes = preferences[dateKeyForDay] ?? [];
        console.log("preferences ", preferences);
        console.log("selectedTimes ", selectedTimes);

        const isActive = selectedTimes.length > 0;
        console.log("isActive ", isActive);

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
              <Text style={styles.dayTitle}>{day.label}</Text>
              <Text style={styles.dayHint}>
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

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Save Preferences</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
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
});
