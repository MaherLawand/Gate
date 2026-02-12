import { bookSession } from "@/src/services/bookingService";
import { colors } from "@/src/theme/colors";
import { ScheduledSession } from "@/src/types/models";
import DateTimePicker from "@react-native-community/datetimepicker";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ActionSheet, {
  ActionSheetRef,
  ScrollView as SheetScrollView,
} from "react-native-actions-sheet";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  isHijabi?: boolean;
};

type Props = {
  sheetRef: React.RefObject<ActionSheetRef | null>;
  dateKey: string;
  editingSession?: ScheduledSession | null;
  onClose: () => void;
  onSaved: () => void;
};

const WORK_START_MINUTES = 6 * 60; // 06:00
const WORK_END_MINUTES = 21 * 60; // 21:00
const SESSION_DURATION = 60; // 1 hour

export default function BookingModal({
  sheetRef,
  dateKey,
  editingSession,
  onClose,
  onSaved,
}: Props) {
  const trainerId = auth().currentUser?.uid;

  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fromTime, setFromTime] = useState<Date | null>(null);
  const [toTime, setToTime] = useState<Date | null>(null);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  const pendingClose = useRef(false);
  const isSubmittingRef = useRef(false);
  const allowCloseRef = useRef(false);
  const originalBooking = useRef<{
    clientId: string | null;
    from: string | null;
    to: string | null;
  } | null>(null);

  const hasUnsavedBookingChanges = useMemo(() => {
    if (!originalBooking.current) return false;

    return (
      originalBooking.current.clientId !== selectedClient?.id ||
      originalBooking.current.from !== formatTime(fromTime) ||
      originalBooking.current.to !== formatTime(toTime)
    );
  }, [selectedClient, fromTime, toTime]);

  const resetBookingState = () => {
    setSelectedClient(null);
    setFromTime(null);
    setToTime(null);
    setQuery("");
  };

  const forceCloseSheet = () => {
    pendingClose.current = false;

    // reset state
    setSelectedClient(null);
    setFromTime(null);
    setToTime(null);
    setQuery("");

    sheetRef.current?.hide();
  };

  // const attemptCloseSheet = () => {
  //   console.log("unsavedchanges: ", hasUnsavedChanges);
  //   if (!hasUnsavedChanges) {
  //     forceCloseSheet();
  //     return;
  //   }

  //   if (pendingClose.current) return;
  //   pendingClose.current = true;

  //   Alert.alert(
  //     "Discard changes?",
  //     "If you leave now, your changes will be lost.",
  //     [
  //       {
  //         text: "Stay",
  //         style: "cancel",
  //         onPress: () => {
  //           pendingClose.current = false;

  //           requestAnimationFrame(() => {
  //             sheetRef.current?.show();
  //           });
  //         },
  //       },
  //       {
  //         text: "Discard",
  //         style: "destructive",
  //         onPress: forceCloseSheet,
  //       },
  //     ]
  //   );
  // };

  function getWeekKeyFromDate(dateKey: string) {
    const d = new Date(dateKey);
    const day = d.getDay(); // 0=Sun ... 6=Sat
    const diff = day === 6 ? 0 : -(day + 1);
    const saturday = new Date(d);
    saturday.setDate(d.getDate() + diff);
    return saturday.toISOString().split("T")[0];
  }

  useEffect(() => {
    if (!selectedClient || !dateKey) {
      setPreferredTimes([]);
      return;
    }

    const loadPreferences = async () => {
      try {
        setLoadingPrefs(true);

        const weekKey = getWeekKeyFromDate(dateKey);

        const prefSnap = await firestore()
          .collection("clients")
          .doc(selectedClient.id)
          .collection("weekly_preferences")
          .doc(weekKey)
          .get();

        if (!prefSnap.exists) {
          setPreferredTimes([]);
          return;
        }

        const data = prefSnap.data();
        const prefsForDay: string[] = data?.preferences?.[dateKey] ?? [];

        setPreferredTimes(prefsForDay);
      } catch (e) {
        console.error("Failed to load client preferences", e);
        setPreferredTimes([]);
      } finally {
        setLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, [selectedClient?.id, dateKey]);

  const isEdit = !!editingSession;

  // -------- load clients --------
  useEffect(() => {
    if (!trainerId || !sheetRef) return;
    console.log("Loading clients for trainer:", trainerId);

    firestore()
      .collection("clients")
      .where("trainerId", "==", trainerId)
      .get()
      .then((snap) => {
        snap.docs.map((d) => {
          console.log("ddata: ", d);
        }),
          setClients(
            snap.docs.map((d) => ({
              id: d.id,
              firstName: d.data().firstName,
              lastName: d.data().lastName,
              gender: d.data().gender,
              isHijabi: d.data().isHijabi,
            }))
          );
      });
  }, [trainerId, sheetRef]);

  function parseTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  useEffect(() => {
    if (!editingSession) return;

    const [first, ...rest] = editingSession.clientName.split(" ");

    const client = {
      id: editingSession.clientId,
      firstName: first,
      lastName: rest.join(" "),
      gender: editingSession.clientGender,
      isHijabi: editingSession.clientIsHijabi,
    };

    setSelectedClient(client);
    setFromTime(parseTime(editingSession.startTime));
    setToTime(parseTime(editingSession.endTime));
    setQuery("");
    setShowDropdown(false);
  }, [editingSession]);

  useEffect(() => {
    if (!sheetRef.current) return;
    originalBooking.current = {
      clientId: editingSession?.clientId ?? null,
      from: editingSession?.startTime ?? null,
      to: editingSession?.endTime ?? null,
    };
  }, [editingSession]);

  // -------- filtered clients --------
  const filteredClients = useMemo(() => {
    if (query.trim().length < 1 || selectedClient) return [];
    console.log("Filtering clients with query:", query);
    console.log("All clients:", clients);
    return clients.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, clients, selectedClient]);

  // -------- helpers --------

  function isWithinWorkingHours(date: Date) {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return (
      minutes >= WORK_START_MINUTES &&
      minutes + SESSION_DURATION <= WORK_END_MINUTES
    );
  }
  function getMinTime() {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  }

  function getMaxTime() {
    const d = new Date();
    d.setHours(20, 0, 0, 0); // latest START time
    return d;
  }
  function formatTime(d: Date | null) {
    if (!d) return "--:--";

    const hours = d.getHours(); // 0–23 ALWAYS
    const minutes = d.getMinutes();

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }
  function addOneHour(date: Date) {
    const d = new Date(date);
    d.setHours(d.getHours() + 1);
    return d;
  }
  function roundToFiveMinutes(date: Date) {
    const d = new Date(date);
    const minutes = d.getMinutes();
    const rounded = Math.round(minutes / 5) * 5;
    d.setMinutes(rounded, 0, 0);
    return d;
  }

  function timeToMinutes(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function logStep(step: string, data?: any) {
    console.log(`🧩 [BOOKING DEBUG] ${step}`, data ?? "");
  }

  // -------- old save --------
  // const handleSave = async () => {
  //   console.log("🚀 handleSave started");
  //   console.log("selectedClient2 : ", selectedClient);

  //   if (!trainerId || !selectedClient || !fromTime || !toTime) {
  //     console.warn("❌ Missing required data", {
  //       trainerId,
  //       selectedClient,
  //       fromTime,
  //       toTime,
  //     });
  //     Alert.alert("Missing data", "Fill all fields");
  //     return;
  //   }

  //   if (toTime <= fromTime) {
  //     console.warn("❌ Invalid time range", { fromTime, toTime });
  //     Alert.alert("Invalid time", "`To` must be after `From`");
  //     return;
  //   }

  //   try {
  //     /* ---------------- RULE 1 ---------------- */

  //     const scheduleRootRef = firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId);

  //     console.log("scheduleRootRef: ", scheduleRootRef);

  //     const rootSnap = await scheduleRootRef.get();

  //     console.log("rootSnap: ", rootSnap);

  //     if (!rootSnap.exists) {
  //       await scheduleRootRef.set({
  //         createdAt: firestore.FieldValue.serverTimestamp(),
  //       });
  //     }

  //     console.log("🔍 RULE 1: Checking existing client booking");

  //     const existingSnap = await firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId)
  //       .collection("days")
  //       .doc(dateKey)
  //       .collection("sessions")
  //       .where("clientId", "==", selectedClient.id)
  //       .get();

  //     console.log("✅ RULE 1 query success. Docs:", existingSnap.docs.length);

  //     const hasConflict = existingSnap.docs.some(
  //       (doc) => doc.id !== editingSession?.id
  //     );

  //     console.log("hasConflict:", hasConflict);

  //     if (hasConflict) {
  //       Alert.alert(
  //         "Booking conflict",
  //         "This client already has a session booked on this day."
  //       );
  //       return;
  //     }

  //     /* ---------------- RULE 2 ---------------- */
  //     console.log("🔍 RULE 2: Checking trainer overlap");

  //     const overlappingSnap = await firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId)
  //       .collection("days")
  //       .doc(dateKey)
  //       .collection("sessions")
  //       .get();

  //     console.log(
  //       "✅ RULE 2 query success. Sessions:",
  //       overlappingSnap.docs.length
  //     );

  //     const newStart = fromTime.getHours() * 60 + fromTime.getMinutes();
  //     const newEnd = toTime.getHours() * 60 + toTime.getMinutes();

  //     console.log("New session minutes:", { newStart, newEnd });

  //     const hasOverlap = overlappingSnap.docs.some((doc) => {
  //       if (doc.id === editingSession?.id) return false;

  //       const s = doc.data();
  //       const existingStart = timeToMinutes(s.startTime);
  //       const existingEnd = timeToMinutes(s.endTime);

  //       console.log("Comparing with session:", {
  //         sessionId: doc.id,
  //         existingStart,
  //         existingEnd,
  //       });

  //       return newStart < existingEnd && newEnd > existingStart;
  //     });

  //     console.log("hasOverlap:", hasOverlap);

  //     if (hasOverlap) {
  //       Alert.alert(
  //         "Time conflict",
  //         "This time overlaps with another session."
  //       );
  //       return;
  //     }

  //     /* ---------------- RULE 4 ---------------- */
  //     console.log("🔍 RULE 4: Hijabi privacy rule");

  //     console.log("Selected client gender data:", {
  //       gender: selectedClient.gender,
  //       isHijabi: selectedClient.isHijabi,
  //     });

  //     if (
  //       selectedClient.gender === "male" ||
  //       (selectedClient.gender === "female" && selectedClient.isHijabi)
  //     ) {
  //       console.log("➡️ Hijabi rule ACTIVE, loading trainer_schedules");

  //       const trainersSnap = await firestore()
  //         .collection("trainer_schedules")
  //         .get();

  //       console.log(
  //         "✅ trainer_schedules read success. Trainers:",
  //         trainersSnap.docs.map((d) => d.id)
  //       );

  //       for (const trainerDoc of trainersSnap.docs) {
  //         console.log("🔎 Checking trainer:", trainerDoc.id);

  //         const daysRef = trainerDoc.ref
  //           .collection("days")
  //           .doc(dateKey)
  //           .collection("sessions");

  //         const sessionsSnap = await daysRef.get();

  //         console.log(
  //           `📅 ${trainerDoc.id} sessions on ${dateKey}:`,
  //           sessionsSnap.docs.length
  //         );

  //         for (const doc of sessionsSnap.docs) {
  //           if (doc.id === editingSession?.id) continue;

  //           const s = doc.data();
  //           console.log("s: ", s);
  //           const existingStart = timeToMinutes(s.startTime);
  //           const existingEnd = timeToMinutes(s.endTime);

  //           const overlaps = newStart < existingEnd && newEnd > existingStart;

  //           if (!overlaps) continue;

  //           console.log("⚠️ Overlap found with session:", doc.id);

  //           console.log("Other client gender data:", s);

  //           const isHijabiFemale =
  //             s?.clientGender === "female" && s.isHijabi === true;

  //           const isMale = s?.clientGender === "male";

  //           if (
  //             (selectedClient.gender === "male" && isHijabiFemale) ||
  //             (selectedClient.gender === "female" &&
  //               selectedClient.isHijabi &&
  //               isMale)
  //           ) {
  //             if (selectedClient.gender === "male") {
  //               Alert.alert(
  //                 "Booking restricted",
  //                 "A hijabi female has already been booked at that time"
  //               );
  //             } else {
  //               Alert.alert(
  //                 "Booking restricted",
  //                 "A male has already been booked at that time"
  //               );
  //             }

  //             return;
  //           }
  //         }
  //       }
  //     }

  //     /* ---------------- RULE 5 ---------------- */
  //     console.log("🔍 RULE 5: Checking active package");

  //     let clientPackageId = editingSession?.clientPackageId;

  //     if (!editingSession) {
  //       const packageSnap = await firestore()
  //         .collection("clients")
  //         .doc(selectedClient.id)
  //         .collection("packages")
  //         .where("status", "==", "active")
  //         .where("sessionsRemaining", ">", 0)
  //         .limit(1)
  //         .get();

  //       console.log("📦 Package query result:", packageSnap.docs.length);

  //       if (packageSnap.empty) {
  //         Alert.alert(
  //           "No active package",
  //           "This client has no active package or no sessions remaining."
  //         );
  //         return;
  //       }

  //       clientPackageId = packageSnap.docs[0].id;
  //     }

  //     /* ---------------- SAVE ---------------- */
  //     console.log("💾 Saving booking");

  //     const payload = {
  //       clientId: selectedClient.id,
  //       clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
  //       clientPackageId,
  //       date: dateKey,
  //       startTime: formatTime(fromTime),
  //       endTime: formatTime(toTime),
  //       clientGender: selectedClient.gender,
  //       isHijabi: selectedClient.isHijabi ?? false,
  //       attendance: editingSession ? editingSession.attendance : "pending",
  //       updatedAt: firestore.FieldValue.serverTimestamp(),
  //     };
  //     console.log(payload);

  //     const sessionsRef = firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId)
  //       .collection("days")
  //       .doc(dateKey)
  //       .collection("sessions");

  //     console.log("sessionRef: ", sessionsRef);

  //     if (editingSession) {
  //       await sessionsRef.doc(editingSession.id).update(payload);
  //     } else {
  //       await sessionsRef.add({
  //         ...payload,
  //         createdAt: firestore.FieldValue.serverTimestamp(),
  //       });
  //     }

  //     console.log("✅ Booking saved successfully");

  //     onSaved();
  //     onClose();
  //   } catch (e: any) {
  //     console.error("🔥 ERROR saving booking:", e);
  //     Alert.alert("Error", e.message);
  //   }
  // };

  // -------- new save --------
  // const handleSave = async () => {
  //   console.log("🚀 handleSave started");

  //   if (!trainerId || !selectedClient || !fromTime || !toTime) {
  //     Alert.alert("Missing data", "Fill all fields");
  //     return;
  //   }

  //   if (toTime <= fromTime) {
  //     Alert.alert("Invalid time", "`To` must be after `From`");
  //     return;
  //   }

  //   const newStart = fromTime.getHours() * 60 + fromTime.getMinutes();
  //   const newEnd = toTime.getHours() * 60 + toTime.getMinutes();

  //   /* ---------------- PAST DATE / TIME CHECK ---------------- */

  //   const now = new Date();

  //   const bookingDate = new Date(`${dateKey}T00:00:00`);
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);

  //   // ❌ Past day
  //   if (bookingDate < today) {
  //     Alert.alert("Invalid booking", "You cannot book old sessions");
  //     return;
  //   }

  //   // ❌ Today but past time
  //   if (bookingDate.getTime() === today.getTime()) {
  //     const nowMinutes = now.getHours() * 60 + now.getMinutes();

  //     if (newStart <= nowMinutes) {
  //       Alert.alert(
  //         "Invalid booking",
  //         "You cannot book a session in the past."
  //       );
  //       return;
  //     }
  //   }

  //   try {
  //     /* ---------------- RULE 1: CLIENT SAME DAY ---------------- */
  //     const sessionsRef = firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId)
  //       .collection("days")
  //       .doc(dateKey)
  //       .collection("sessions");

  //     const existingClientSnap = await firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId)
  //       .collection("days")
  //       .doc(dateKey)
  //       .collection("sessions")
  //       .where("clientId", "==", selectedClient.id)
  //       .get();

  //     const hasClientConflict = existingClientSnap.docs.some(
  //       (d) => d.id !== editingSession?.id
  //     );

  //     if (hasClientConflict) {
  //       Alert.alert(
  //         "Booking conflict",
  //         "This client already has a session booked on this day."
  //       );
  //       return;
  //     }

  //     /* ---------------- RULE 2: TRAINER OVERLAP ---------------- */

  //     const trainerSessionsSnap = await firestore()
  //       .collection("trainer_schedules")
  //       .doc(trainerId)
  //       .collection("days")
  //       .doc(dateKey)
  //       .collection("sessions")
  //       .get();

  //     const trainerOverlap = trainerSessionsSnap.docs.some((doc) => {
  //       if (doc.id === editingSession?.id) return false;

  //       const s = doc.data();
  //       const start = timeToMinutes(s.startTime);
  //       const end = timeToMinutes(s.endTime);

  //       return newStart < end && newEnd > start;
  //     });

  //     if (trainerOverlap) {
  //       Alert.alert(
  //         "Time conflict",
  //         "This time overlaps with another session."
  //       );
  //       return;
  //     }

  //     /* ---------------- RULE 3: ACTIVE PACKAGE ---------------- */

  //     let clientPackageId = editingSession?.clientPackageId;

  //     if (!editingSession) {
  //       const packageSnap = await firestore()
  //         .collection("clients")
  //         .doc(selectedClient.id)
  //         .collection("packages")
  //         .where("status", "==", "active")
  //         .where("sessionsRemaining", ">", 0)
  //         .limit(1)
  //         .get();

  //       if (packageSnap.empty) {
  //         Alert.alert(
  //           "No active package",
  //           "This client has no active package or no sessions remaining."
  //         );
  //         return;
  //       }

  //       clientPackageId = packageSnap.docs[0].id;
  //     }
  //     /* ---------------- SESSION ID ---------------- */

  //     const sessionId = editingSession
  //       ? editingSession.id
  //       : sessionsRef.doc().id;
  //     /* ---------------- SLOT LOCK ---------------- */

  //     console.log("🔒 Locking gym time slot");

  //     // If editing, release old slot first
  //     if (
  //       editingSession &&
  //       (editingSession.startTime !== formatTime(fromTime) ||
  //         editingSession.endTime !== formatTime(toTime))
  //     ) {
  //       await firestore()
  //         .collection("gym_time_slots")
  //         .doc(editingSession.id)
  //         .delete()
  //         .catch(() => {});
  //     }

  //     await lockGymTimeSlot({
  //       sessionId,
  //       date: dateKey,
  //       startTime: formatTime(fromTime),
  //       endTime: formatTime(toTime),
  //       trainerId,
  //       clientId: selectedClient.id,
  //       clientGender: selectedClient.gender as "male" | "female",
  //       clientIsHijabi: selectedClient.isHijabi ?? false,
  //     });

  //     /* ---------------- SAVE SESSION ---------------- */

  //     const payload = {
  //       clientId: selectedClient.id,
  //       clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
  //       clientPackageId,
  //       date: dateKey,
  //       startTime: formatTime(fromTime),
  //       endTime: formatTime(toTime),
  //       clientGender: selectedClient.gender,
  //       isHijabi: selectedClient.isHijabi ?? false,
  //       attendance: editingSession ? editingSession.attendance : "pending",
  //       updatedAt: firestore.FieldValue.serverTimestamp(),
  //     };

  //     if (editingSession) {
  //       await sessionsRef.doc(sessionId).update(payload);
  //     } else {
  //       await sessionsRef.doc(sessionId).set({
  //         ...payload,
  //         createdAt: firestore.FieldValue.serverTimestamp(),
  //       });
  //     }

  //     console.log("✅ Booking saved successfully");

  //     onSaved();
  //     onClose();
  //   } catch (e: any) {
  //     console.error("🔥 Booking failed:", e);
  //     Alert.alert("Booking failed", e.message);
  //   }
  // };
  const handleSave = async () => {
    try {
      if (!trainerId || !selectedClient || !fromTime || !toTime) {
        Alert.alert("Missing data", "Fill all fields");
        return;
      }
      const ONE_HOUR = 60;

      const startMinutes = fromTime.getHours() * 60 + fromTime.getMinutes();
      const endMinutes = toTime.getHours() * 60 + toTime.getMinutes();

      if (endMinutes - startMinutes !== ONE_HOUR) {
        Alert.alert(
          "Invalid session length",
          "Sessions must be exactly 1 hour long."
        );
        return;
      }

      if (startMinutes < WORK_START_MINUTES || endMinutes > WORK_END_MINUTES) {
        Alert.alert(
          "Invalid time",
          "Sessions must be between 06:00 and 21:00."
        );
        return;
      }
      isSubmittingRef.current = true;
      await bookSession({
        trainerId,
        dateKey,
        selectedClient: {
          id: selectedClient.id,
          firstName: selectedClient.firstName,
          lastName: selectedClient.lastName,
          gender: selectedClient.gender as "male" | "female",
          isHijabi: selectedClient.isHijabi,
        },
        fromTime,
        toTime,
        editingSession,
      });
      //check this out later
      // allowCloseRef.current = true; // ✅ allow close ONCE
      // resetBookingState();
      // sheetRef.current?.hide();
      //onSaved();
      allowCloseRef.current = true;
      sheetRef.current?.hide();
      requestAnimationFrame(() => {
        resetBookingState();
        onSaved();
      });
    } catch (e: any) {
      isSubmittingRef.current = false;
      console.error("🔥 Booking failed:", e);
      Alert.alert("Booking failed", e.message);
    }
  };

  return (
    <ActionSheet
      ref={sheetRef}
      gestureEnabled={!hasUnsavedBookingChanges}
      closeOnTouchBackdrop
      keyboardHandlerEnabled
      indicatorStyle={{ backgroundColor: colors.primary }}
      containerStyle={{
        backgroundColor: colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 8,
      }}
      onBeforeClose={() => {
        // ✅ allow close after save / discard
        if (allowCloseRef.current) {
          allowCloseRef.current = false;
          return true;
        }

        // ✅ no changes → allow close
        if (!hasUnsavedBookingChanges) {
          return true;
        }

        // ❌ block close + alert
        Alert.alert(
          "Discard changes?",
          "If you leave now, your changes will be lost.",
          [
            {
              text: "Stay",
              style: "cancel",
              onPress: () => {
                allowCloseRef.current = false;
                sheetRef.current?.show();
              },
            },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                allowCloseRef.current = true;
                resetBookingState();
                sheetRef.current?.hide();
              },
            },
          ]
        );

        return false;
      }}
    >
      <SheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 30,
        }}
      >
        <Text style={styles.title}>
          {isEdit ? "Edit booking" : "Book session"}
        </Text>

        {/* CLIENT AUTOCOMPLETE */}
        <Text style={styles.label}>Client</Text>
        <TextInput
          style={styles.input}
          placeholder="Type client name"
          placeholderTextColor={colors.textSecondary}
          value={
            selectedClient
              ? `${selectedClient.firstName} ${selectedClient.lastName}`
              : query
          }
          onChangeText={(text) => {
            setQuery(text);
            setSelectedClient(null);
            setShowDropdown(true);
          }}
        />
        <View style={{ position: "relative" }}>
          {showDropdown && filteredClients.length > 0 && (
            <View style={styles.dropdown}>
              <ScrollView>
                {filteredClients.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedClient(c);
                      setQuery("");
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={styles.clientText}>
                      {c.firstName} {c.lastName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        {/* Preffered Times */}

        {loadingPrefs && (
          <Text style={styles.prefLoading}>Loading client preferences…</Text>
        )}

        {!loadingPrefs && preferredTimes.length > 0 && (
          <View style={styles.prefBox}>
            <Text style={styles.prefTitle}>Client preferred times</Text>

            <View style={styles.prefTimesRow}>
              {preferredTimes.map((t) => (
                <View key={t} style={styles.prefTimeChip}>
                  <Text style={styles.prefTimeText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!loadingPrefs && preferredTimes.length === 0 && selectedClient && (
          <Text style={styles.prefEmpty}>No preferred times for this day</Text>
        )}

        {/* TIME PICKERS */}
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={styles.timeBox}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.timeLabel}>From</Text>
            <Text style={styles.timeValue}>{formatTime(fromTime)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.timeBox, { opacity: 0.6 }]} disabled>
            <Text style={styles.timeLabel}>To</Text>
            <Text style={styles.timeValue}>{formatTime(toTime)}</Text>
          </TouchableOpacity>
        </View>
        {showFromPicker && (
          <DateTimePicker
            mode="time"
            is24Hour={true}
            minuteInterval={5}
            value={fromTime ?? getMinTime()}
            minimumDate={getMinTime()} // ✅ 06:00
            maximumDate={getMaxTime()} // ✅ 20:00
            display={Platform.OS === "android" ? "spinner" : "default"}
            onChange={(_, d) => {
              setShowFromPicker(false);
              if (!d) return;

              const rounded = roundToFiveMinutes(d);

              // 🔒 Safety clamp
              if (!isWithinWorkingHours(rounded)) {
                Alert.alert(
                  "Outside working hours",
                  "Sessions can only be booked between 06:00 and 21:00."
                );
                return;
              }

              setFromTime(rounded);
              setToTime(addOneHour(rounded)); // ✅ force 1 hour
            }}
          />
        )}

        {showToPicker && (
          <DateTimePicker
            mode="time"
            is24Hour={true}
            minuteInterval={5} // ✅ THIS
            value={toTime ?? new Date()}
            display={Platform.OS === "android" ? "spinner" : "default"}
            onChange={(_, d) => {
              setShowToPicker(false);
              if (d) setToTime(d);
            }}
          />
        )}

        {/* ACTIONS */}
        <View style={styles.actions}>
          {/* <TouchableOpacity
            onPress={() => {
              attemptCloseSheet();
            }}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity> */}

          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.save}>Save booking</Text>
          </TouchableOpacity>
        </View>
      </SheetScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 8,
  },
  timeText: {
    color: colors.textPrimary,
  },
  // dropdown: {
  //   backgroundColor: colors.card,
  //   borderRadius: 8,
  //   maxHeight: 160,
  //   marginTop: 4,
  //   position: "absolute",
  //   width: "100%",
  //   zIndex: 10,
  // },
  //check this out later
  dropdown: {
    backgroundColor: colors.card,
    borderRadius: 8,
    maxHeight: 160,
    marginTop: 4,
    position: "absolute",
    width: "100%",
    zIndex: 100,
    elevation: 10, // ✅ ANDROID
    shadowColor: "#000", // ✅ iOS
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    padding: 12,
  },
  clientText: {
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  cancel: {
    color: colors.textSecondary,
  },
  save: {
    color: colors.primary,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  timeBox: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 8,
  },
  timeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  timeValue: {
    color: colors.textPrimary,
    fontSize: 16,
    marginTop: 4,
  },
  prefBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },

  prefTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },

  prefTimesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  prefTimeChip: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  prefTimeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  prefEmpty: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },

  prefLoading: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
