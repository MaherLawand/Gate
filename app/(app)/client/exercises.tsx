import { useClient } from "@/src/components/ClientContext";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getClientSessions } from "@/src/services/ClientService";
import { SessionWithId } from "@/src/types/models";

export default function ClientExercisesScreen() {
  const { sessionId, date } = useLocalSearchParams<{
    sessionId: string;
    date: string;
  }>();

  const clientCtx = useClient();
  const clientId = clientCtx?.clientId ?? null;

  const [session, setSession] = useState<SessionWithId | null>(null);

  /* ---------------- LOAD SESSION ---------------- */

  useEffect(() => {
    if (!clientId || !sessionId) return;

    const load = async () => {
      try {
        const sessions = await getClientSessions(clientId);
        const current = sessions.find((s) => s.id === sessionId);

        if (!current) {
          Alert.alert("Error", "Session not found");
          router.back();
          return;
        }

        setSession(current);
      } catch (e: any) {
        Alert.alert("Error", e.message);
      }
    };

    load();
  }, [clientId, sessionId]);

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={[typography.title, styles.title]}>
        Session • {date}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {session?.exercises?.length ? (
          session.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseCard}>
              <Text style={[typography.title, styles.exerciseName]}>
                {ex.name}
              </Text>

              <View style={styles.readonlyGroup}>
                {ex.sets?.map((set, index) => (
                  <View key={index} style={styles.readonlyRow}>
                    <Text style={styles.readonlyLabel}>
                      Set {index + 1}
                    </Text>

                    <Text style={styles.readonlyValue}>
                      {set.reps} reps • {set.weightKg} kg
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: 20 },
            ]}
          >
            No exercises assigned for this session.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  title: {
    color: colors.textPrimary,
  
    marginBottom:20,
  },

  exerciseCard: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exerciseName: {
    color: colors.textPrimary,
    marginBottom: 14,
  },

  readonlyGroup: {
    gap: 10,
  },

  readonlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  readonlyLabel: {
    color: colors.textSecondary,
  },

  readonlyValue: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});