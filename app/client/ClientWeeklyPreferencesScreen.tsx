import { colors } from "@/src/theme/colors";
import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

/* ---------------- CONSTANTS ---------------- */

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const TIME_SLOTS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

/* ---------------- HELPERS ---------------- */

function getWeekRange() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toDateString(),
    end: sunday.toDateString(),
  };
}

/* ---------------- COMPONENT ---------------- */

export default function ClientWeeklyPreferencesScreen() {
  // 🔢 example value — later comes from package
  const sessionsPerWeek = 3;

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<{
    [day: string]: string[];
  }>({});

  const week = useMemo(() => getWeekRange(), []);

  /* ---------------- DAY TOGGLE ---------------- */

  function toggleDay(day: string) {
    if (selectedDays.includes(day)) {
      // remove day
      setSelectedDays((prev) => prev.filter((d) => d !== day));

      setTimeSlots((prev) => {
        const copy = { ...prev };
        delete copy[day];
        return copy;
      });
    } else {
      if (selectedDays.length >= sessionsPerWeek) {
        Alert.alert(
          "Limit reached",
          `You can only select ${sessionsPerWeek} days this week`
        );
        return;
      }

      setSelectedDays((prev) => [...prev, day]);
    }
  }

  /* ---------------- TIME TOGGLE ---------------- */

  function toggleTime(day: string, time: string) {
    setTimeSlots((prev) => {
      const current = prev[day] || [];

      const updated = current.includes(time)
        ? current.filter((t) => t !== time)
        : [...current, time];

      return {
        ...prev,
        [day]: updated,
      };
    });
  }

  /* ---------------- SAVE ---------------- */

  function handleSave() {
    if (selectedDays.length !== sessionsPerWeek) {
      Alert.alert(
        "Incomplete selection",
        `Please select exactly ${sessionsPerWeek} days`
      );
      return;
    }

    for (const day of selectedDays) {
      if (!timeSlots[day] || timeSlots[day].length === 0) {
        Alert.alert(
          "Missing time",
          `Please select at least one time for ${day}`
        );
        return;
      }
    }

    const payload = {
      weekStart: week.start,
      weekEnd: week.end,
      sessionsPerWeek,
      preferences: timeSlots,
    };

    console.log("✅ Weekly preferences payload:", payload);

    Alert.alert("Saved", "Your training preferences were saved");
  }

  /* ---------------- RENDER ---------------- */

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <Text style={styles.title}>Weekly Training Preferences</Text>
      <Text style={styles.subTitle}>
        {week.start} – {week.end}
      </Text>

      <Text style={styles.info}>
        Sessions this week:{" "}
        <Text style={styles.bold}>{sessionsPerWeek}</Text>
      </Text>

      {/* DAYS */}
      <Text style={styles.sectionTitle}>Choose your training days</Text>

      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const selected = selectedDays.includes(day);
          const disabled =
            !selected && selectedDays.length >= sessionsPerWeek;

          return (
            <TouchableOpacity
              key={day}
              onPress={() => toggleDay(day)}
              disabled={disabled}
              style={[
                styles.dayChip,
                selected && styles.dayChipActive,
                disabled && { opacity: 0.3 },
              ]}
            >
              <Text style={styles.dayText}>
                {day.slice(0, 3).toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* TIME SLOTS */}
      {selectedDays.map((day) => (
        <View key={day} style={styles.daySection}>
          <Text style={styles.dayTitle}>{day.toUpperCase()}</Text>

          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const active = timeSlots[day]?.includes(time);

              return (
                <TouchableOpacity
                  key={time}
                  onPress={() => toggleTime(day, time)}
                  style={[
                    styles.timeSlot,
                    active && styles.timeSlotActive,
                  ]}
                >
                  <Text style={styles.timeText}>{time}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* SAVE */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Save Weekly Preferences</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },

  subTitle: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },

  info: {
    marginTop: 10,
    color: colors.textSecondary,
  },

  bold: {
    color: colors.textPrimary,
    fontWeight: "700",
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#222",
  },

  dayChipActive: {
    backgroundColor: colors.primary,
  },

  dayText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  daySection: {
    marginTop: 24,
  },

  dayTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: 8,
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  timeSlot: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#333",
  },

  timeSlotActive: {
    backgroundColor: "#22C55E",
  },

  timeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  saveBtn: {
    marginTop: 32,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
