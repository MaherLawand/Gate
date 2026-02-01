import ScheduleHeaderSkeleton from "@/src/components/skeletons/Schedule/ScheduleHeaderSkeleton";
import ScheduleTimeColumnSkeleton from "@/src/components/skeletons/Schedule/ScheduleTimeColumnSkeleton";
import ScheduleTimelineSkeleton from "@/src/components/skeletons/Schedule/ScheduleTimelineSkeleton";
import { cancelBooking } from "@/src/services/cancelBooking";
import { resolveAttendance } from "@/src/services/resolveAttendance";
import { colors } from "@/src/theme/colors";
import { ScheduledSession } from "@/src/types/models";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActionSheetRef } from "react-native-actions-sheet";
import BookingModal from "../../src/components/BookingModal";

type EnrichedScheduledSession = ScheduledSession & {
  clientIsHijabi?: boolean;
};

// -------- helpers --------
const START_HOUR = 7; // 7 AM
const END_HOUR = 21;
const MINUTE_HEIGHT = 2; // tweak later
const DAY_START = START_HOUR * 60; // 7:00 → 420
const DAY_END = END_HOUR * 60; // 21:00 → 1260
const TIMELINE_HEIGHT = (DAY_END - DAY_START) * MINUTE_HEIGHT;
const SLOT_MINUTES = 30;
const SESSION_GAP = 5; // px (try 3–6)
const DEV_SKELETON_DELAY = 2200; // ms

const slots = Array.from(
  { length: ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES },
  (_, i) => START_HOUR * 60 + i * SLOT_MINUTES
);
function formatDate(date: Date) {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type HijabiBlock = {
  startMinutes: number;
  endMinutes: number;
  clientName: string;
  trainerId: string;
};
// -------- component --------
export default function TrainerScheduleScreen() {
  const uid = auth().currentUser?.uid;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<EnrichedScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [hijabiBlocks, setHijabiBlocks] = useState<HijabiBlock[]>([]);

  const [editingSession, setEditingSession] = useState<ScheduledSession | null>(
    null
  );

  const dateKey = useMemo(() => formatDate(currentDate), [currentDate]);

  const [open, setOpen] = useState(false);

  const bookingSheetRef = useRef<ActionSheetRef>(null);

  function AttendanceBadge({
    status,
  }: {
    status: ScheduledSession["attendance"];
  }) {
    if (status === "confirmed") {
      return <Text style={[styles.badge, styles.attended]}>✔ Attended</Text>;
    }

    if (status === "no_show") {
      return <Text style={[styles.badge, styles.noShow]}>⚠ No show</Text>;
    }

    if (status === "charged-no-show") {
      return <Text style={[styles.badge, styles.charged]}>❌ Charged</Text>;
    }

    return null;
  }

  // -------- load schedule --------
  useEffect(() => {
    if (!uid) return;

    setLoading(true);

    const unsubscribe = firestore()
      .collection("trainer_schedules")
      .doc(uid)
      .collection("days")
      .doc(dateKey)
      .collection("sessions")
      .orderBy("startTime")
      .onSnapshot(
        (snap) => {
          const data: ScheduledSession[] = snap.docs.map((d) => {
            const s = d.data();
            console.log("sdata: ", s);

            const startMinutes = timeToMinutes(s.startTime);
            const endMinutes = timeToMinutes(s.endTime);

            return {
              id: d.id,
              clientId: s.clientId,
              clientName: s.clientName,
              clientPackageId: s.clientPackageId,
              date: s.date,
              startTime: s.startTime,
              endTime: s.endTime,
              attendance: s.attendance,
              clientGender: s.clientGender,
              createdAt: s.createdAt,
              startMinutes,
              endMinutes,
              clientIsHijabi: s.isHijabi,
            };
          });

          setSessions(data);
          setTimeout(() => {
            setLoading(false);
          }, DEV_SKELETON_DELAY);
        },
        (error) => {
          Alert.alert("Error", error.message);
          setTimeout(() => {
            setLoading(false);
          }, DEV_SKELETON_DELAY);
        }
      );

    return () => unsubscribe();
  }, [uid, dateKey]);

  useEffect(() => {
    if (!uid) return;

    const loadHijabiBlocks = async () => {
      const collectedHijabiBlocks: HijabiBlock[] = [];

      const trainersSnap = await firestore()
        .collection("trainer_schedules")
        .get();

      console.log(
        "✅ trainer_schedules read success. Trainers:",
        trainersSnap.docs.map((d) => d.id)
      );

      for (const trainerDoc of trainersSnap.docs) {
        console.log("🔎 Checking trainer:", trainerDoc.id);

        const sessionsSnap = await trainerDoc.ref
          .collection("days")
          .doc(dateKey)
          .collection("sessions")
          .get();

        console.log(
          `📅 ${trainerDoc.id} sessions on ${dateKey}:`,
          sessionsSnap.docs.length
        );

        for (const doc of sessionsSnap.docs) {
          const s = doc.data();
          console.log("s: ", s);
          if (s.clientGender === "female" && s.isHijabi === true) {
            console.log("trainerDocid: ", trainerDoc.id);
            console.log("uid: ", uid);

            // ❌ skip hijabi sessions of the current trainer
            if (trainerDoc.id === uid) continue;
            console.log("continued");
            collectedHijabiBlocks.push({
              trainerId: trainerDoc.id,
              startMinutes: timeToMinutes(s.startTime),
              endMinutes: timeToMinutes(s.endTime),
              clientName: s.clientName,
            });
          }
        }
      }

      console.log("🟡 FINAL hijabi blocks:", collectedHijabiBlocks);
      setHijabiBlocks(collectedHijabiBlocks);
    };

    loadHijabiBlocks();
  }, [dateKey, uid]);

  function overlaps(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number
  ) {
    return aStart < bEnd && aEnd > bStart;
  }

  // -------- timeline hours --------
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  );

  const handleResolve = async (
    session: ScheduledSession,
    mode: "confirmed" | "no_show" | "charged-no-show"
  ) => {
    if (!uid) return;

    if (session.attendance !== "pending") {
      Alert.alert("Already resolved", "This session is already resolved.");
      return;
    }

    try {
      await resolveAttendance({
        trainerId: uid,
        scheduleSessionId: session.id,
        dateKey,
        clientId: session.clientId,
        clientPackageId: session.clientPackageId,
        mode,
      });

      console.log("uid: ", uid);
      // 🔄 reload schedule
      const snap = await firestore()
        .collection("trainer_schedules")
        .doc(uid)
        .collection("days")
        .doc(dateKey)
        .collection("sessions")
        .orderBy("startTime")
        .get();

      setSessions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduledSession))
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // const handleCancelBooking = async (session: ScheduledSession) => {

  //   if (!uid) return;

  //   if (session.attendance !== "pending") {
  //     Alert.alert("Cannot cancel", "Only pending bookings can be cancelled.");
  //     return;
  //   }

  //   try {
  //     const db = firestore();

  //     // 1️⃣ Delete ALL slot locks for this session
  //     const slotsSnap = await db
  //       .collection("gym_time_slots")
  //       .where("sessionId", "==", session.id)
  //       .get();

  //     if (!slotsSnap.empty) {
  //       const batch = db.batch();
  //       slotsSnap.docs.forEach((doc) => {
  //         batch.delete(doc.ref);
  //       });
  //       await batch.commit();
  //     }

  //     // 2️⃣ Delete the session itself
  //     await db
  //       .collection("trainer_schedules")
  //       .doc(uid)
  //       .collection("days")
  //       .doc(session.date)
  //       .collection("sessions")
  //       .doc(session.id)
  //       .delete();

  //   } catch (e: any) {
  //     Alert.alert("Error", e.message);
  //   }
  // };

  // -------- render --------

  const handleCancelBooking = async (session: ScheduledSession) => {
    if (!uid) return;

    // 🔒 Safety: only pending bookings can be cancelled
    if (session.attendance !== "pending") {
      Alert.alert("Cannot cancel", "Only pending bookings can be cancelled.");
      return;
    }

    Alert.alert(
      "Cancel booking",
      "This will permanently remove the booking. Are you sure?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking({
                trainerId: uid,
                session,
              });

              // 🔄 UI refresh is automatic via onSnapshot
              console.log("✅ Booking cancelled:", session.id);
            } catch (e: any) {
              console.error("🔥 Cancel booking failed:", e);
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setCurrentDate(addDays(currentDate, -1))}
        >
          <Text style={styles.nav}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.date}>{currentDate.toDateString()}</Text>

        <TouchableOpacity
          onPress={() => setCurrentDate(addDays(currentDate, 1))}
        >
          <Text style={styles.nav}>▶</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <>
          <ScheduleHeaderSkeleton />

          <View style={{ flexDirection: "row" }}>
            <ScheduleTimeColumnSkeleton />
            <ScheduleTimelineSkeleton />
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.timeline}
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          {sessions.length === 0 && (
            <Text style={styles.empty}>No bookings for this day yet.</Text>
          )}
          <View style={styles.calendar}>
            {/* Hour labels */}
            <View style={styles.hoursColumn}>
              {slots.map((minutes) => {
                const h = Math.floor(minutes / 60);
                const m = minutes % 60;
                return (
                  <View
                    key={minutes}
                    style={[
                      styles.timeSlot,
                      { height: SLOT_MINUTES * MINUTE_HEIGHT },
                    ]}
                  >
                    <Text style={styles.hourText}>
                      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
                    </Text>
                  </View>
                );
              })}
            </View>
            {/* Timeline */}
            <View style={[styles.timelineColumn, { height: TIMELINE_HEIGHT }]}>
              {hijabiBlocks.map((block, index) => {
                const top =
                  (block.startMinutes - DAY_START) * MINUTE_HEIGHT +
                  SESSION_GAP / 2;

                const height =
                  (block.endMinutes - block.startMinutes) * MINUTE_HEIGHT -
                  SESSION_GAP;

                const hasSessionOverlap = sessions.some((s) =>
                  overlaps(
                    block.startMinutes,
                    block.endMinutes,
                    s.startMinutes!,
                    s.endMinutes!
                  )
                );

                return (
                  <View
                    key={`hijabi-${index}`}
                    style={[
                      styles.sessionBlock,
                      styles.hijabiSessionBlock,
                      {
                        top,
                        height,
                        width: hasSessionOverlap ? "30%" : "100%",
                        left: 10,
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.hijabiWarningStrip} />

                    <View style={styles.sessionInner}>
                      <Text style={styles.client}>⚠ Hijabi</Text>
                      <Text style={styles.time}>{block.clientName}</Text>
                      <Text style={styles.time}>
                        {minutesToTime(block.startMinutes)} –
                        {minutesToTime(block.endMinutes)}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {sessions.map((session) => {
                const top =
                  (session.startMinutes! - DAY_START) * MINUTE_HEIGHT +
                  SESSION_GAP / 2;
                const height =
                  (session.endMinutes! - session.startMinutes!) *
                    MINUTE_HEIGHT -
                  SESSION_GAP;

                const hijabiOverlap = hijabiBlocks.some((h) =>
                  overlaps(
                    session.startMinutes!,
                    session.endMinutes!,
                    h.startMinutes,
                    h.endMinutes
                  )
                );
                return (
                  <TouchableOpacity
                    key={session.id}
                    activeOpacity={0.85}
                    disabled={session.attendance === "pending"}
                    onPress={() => {
                      if (session.attendance === "pending") return;
                      router.push({
                        pathname: "/trainer/client/[id]/sessions",
                        params: {
                          id: session.clientId,
                          clientId: session.clientId,
                          sessionId: session.id,
                          date: session.date,
                          packageId: session.clientPackageId,
                          attendance: session.attendance,
                        },
                      });
                    }}
                    style={[
                      styles.sessionBlock,
                      {
                        top,
                        height,
                        width: hijabiOverlap ? "70%" : "100%",
                        left: hijabiOverlap ? "30%" : 10,
                      },
                    ]}
                  >
                    <View style={styles.sessionInner}>
                      {/* TOP CONTENT */}
                      <View>
                        <Text style={styles.client}>{session.clientName}</Text>
                        <Text style={styles.time}>
                          {session.startTime} – {session.endTime}
                        </Text>
                      </View>
                      {/* FLEX SPACER */}
                      <View style={{ flex: 1 }} />
                      {/* ACTIONS */}
                      {session.attendance === "pending" && (
                        <>
                          <View style={styles.divider} />
                          <View style={styles.actionBar}>
                            {/* LEFT */}
                            <View style={styles.actionGroup}>
                              <TouchableOpacity
                                style={[styles.iconBtn, styles.success]}
                                onPress={() =>
                                  handleResolve(session, "confirmed")
                                }
                              >
                                <Text style={styles.iconText}>✓</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.iconBtn, styles.warning]}
                                onPress={() =>
                                  handleResolve(session, "no_show")
                                }
                              >
                                <Text style={styles.iconText}>⚠</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.iconBtn, styles.danger]}
                                onPress={() =>
                                  handleResolve(session, "charged-no-show")
                                }
                              >
                                <Text style={styles.iconText}>$</Text>
                              </TouchableOpacity>
                            </View>
                            {/* RIGHT */}
                            <View style={styles.actionGroup}>
                              <TouchableOpacity
                                style={[styles.iconBtn, styles.neutral]}
                                onPress={() => {
                                  setEditingSession(session);
                                  bookingSheetRef.current?.show();
                                }}
                              >
                                <Text style={styles.iconText}>✎</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.iconBtn, styles.outlineDanger]}
                                onPress={() =>
                                  Alert.alert(
                                    "Cancel booking",
                                    "This will remove the booking. Are you sure?",
                                    [
                                      { text: "No", style: "cancel" },
                                      {
                                        text: "Yes",
                                        style: "destructive",
                                        onPress: () =>
                                          handleCancelBooking(session),
                                      },
                                    ]
                                  )
                                }
                              >
                                <Text style={styles.iconText}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </>
                      )}
                      {session.attendance !== "pending" && (
                        <>
                          <View style={styles.divider} />
                          <AttendanceBadge status={session.attendance} />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <BookingModal
            sheetRef={bookingSheetRef}
            dateKey={dateKey}
            editingSession={editingSession}
            onClose={() => {
              bookingSheetRef.current?.hide();
              setEditingSession(null);
            }}
            onSaved={() => {
              bookingSheetRef.current?.hide();
              setEditingSession(null);
            }}
          />
        </ScrollView>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingSession(null);
          bookingSheetRef.current?.show();
        }}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

// -------- styles --------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  nav: {
    color: colors.primary,
    fontSize: 20,
  },
  date: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  timeline: {
    paddingBottom: 40,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: 24,
  },
  hourRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  hourText: {
    width: 60,
    color: colors.textSecondary,
    fontSize: 14,
  },
  hourContent: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  client: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13,
  },

  time: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  action: {
    color: colors.primary,
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 32,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 6,
  },

  primaryPill: {
    backgroundColor: colors.primary,
  },
  warningPill: {
    backgroundColor: "#FFB020",
  },
  dangerPill: {
    backgroundColor: "#E5484D",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  warningText: {
    color: "#1A1A1A",
    fontWeight: "600",
    fontSize: 13,
  },
  dangerText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  neutralPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border ?? "#333",
  },
  neutralDangerPill: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E5484D",
  },
  neutralText: {
    color: colors.textPrimary,
    fontWeight: "500",
    fontSize: 13,
  },
  neutralDangerText: {
    color: "#E5484D",
    fontWeight: "600",
    fontSize: 13,
  },
  badge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
  },

  attended: {
    backgroundColor: "#1F7A4D",
    color: "#E6FFF3",
  },

  noShow: {
    backgroundColor: "#FFB020",
    color: "#1A1A1A",
  },

  charged: {
    backgroundColor: "#E5484D",
    color: "#FFF",
  },

  calendar: {
    flexDirection: "row",
    position: "relative",
  },

  hoursColumn: {
    width: 60,
  },

  hourLabel: {
    justifyContent: "flex-start",
  },

  timelineColumn: {
    flex: 1,
    position: "relative",
  },
  sessionBlock: {
    position: "absolute",
    left: 10,
    right: 10,
    backgroundColor: "#151515",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    overflow: "hidden",
  },

  sessionInner: {
    flex: 1,
    padding: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 8,
  },

  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  iconText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  success: {
    backgroundColor: "#1F7A4D",
  },

  warning: {
    backgroundColor: "#FFB020",
  },

  danger: {
    backgroundColor: "#E5484D",
  },

  neutral: {
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },

  outlineDanger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E5484D",
  },

  actionPanel: {
    position: "absolute",
    left: 8,
    right: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 4,
  },
  timeSlot: {
    justifyContent: "flex-start",
  },
  compactActions: {
    flexDirection: "row",
    marginTop: 6,
    gap: 6,
  },

  compactPrimary: {
    backgroundColor: "#1F7A4D",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  compactWarning: {
    backgroundColor: "#FFB020",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  compactDanger: {
    backgroundColor: "#E5484D",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  compactNeutral: {
    backgroundColor: "#333",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  compactText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  hijabiWarningStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: "#f59e0b", // amber warning
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    zIndex: 5,
  },
  hijabiWarning: {
    position: "absolute",
    left: -70,
    width: 60,
    backgroundColor: "#FACC15",
    borderRadius: 8,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  hijabiWarningText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  hijabiSessionBlock: {
    backgroundColor: "#2A1F0A", // dark amber tint
    borderLeftColor: "#FACC15", // yellow warning
    opacity: 0.95,
  },

  hijabiClientName: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#FACC15",
  },
});
