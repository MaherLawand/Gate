import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import AppButton from "@/src/components/AppButton";
import { compressImage } from "@/src/services/compressImage";
import { uploadBugImage, uploadImage } from "@/src/services/uploadImage";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { BugDoc } from "@/src/types/models";


import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileData = {
  firstName?: string;
  lastName?: string;
  phone: string;
  bio?: string;
  profilePicture?: string;
  trainerName?: string;
  createdAt?: any;
};

type Section = "account" | "preferences" | "bug";
type UploadType = "cover" | "avatar" | "announcement" | "bug";

export default function ProfileScreen() {
  const [section, setSection] = useState<Section>("account");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [clientDocId, setClientDocId] = useState<string | null>(null);

  // BUG REPORT STATE
  const [bugDescription, setBugDescription] = useState("");
  const [bugImage, setBugImage] = useState<string | null>(null);
  const [submittingBug, setSubmittingBug] = useState(false);

  const uid = auth().currentUser?.uid;

  useEffect(() => {
    console.log("Profile data:", profile);
  }, [profile]);

  useEffect(() => {
    if (!uid) return;

    const loadProfile = async () => {
      try {
        // 2️⃣ Otherwise client
        const clientSnap = await firestore()
          .collection("clients")
          .where("authUid", "==", uid)
          .limit(1)
          .get();

        if (!clientSnap.empty) {
          const doc = clientSnap.docs[0];
          setClientDocId(doc.id); // ✅ THIS
          const data = doc.data();

          setProfile({
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            bio: data.bio ?? "",
            trainerName: data.trainerName,
            profilePicture: data.profilePicture ?? undefined,
            createdAt: data.createdAt,
          });

          setFirstName(data.firstName ?? "");
          setLastName(data.lastName ?? "");
          setBio(data.bio ?? "");
          setNotificationsEnabled(data.notificationsEnabled ?? true);
        }
      } catch (e: any) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [uid]);

  const updateNotificationPreference = async (enabled: boolean) => {
    if (!clientDocId) return;

    setSavingNotif(true);

    try {
      await firestore().collection("clients").doc(clientDocId).update({
        notificationsEnabled: enabled,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      Alert.alert("Error", "Failed to update notification settings");
    } finally {
      setSavingNotif(false);
    }
  };

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);

    if (notificationTimeout.current) {
      clearTimeout(notificationTimeout.current);
    }

    notificationTimeout.current = setTimeout(() => {
      updateNotificationPreference(value);
    }, 600);
  };

  const handleSave = async () => {
    try {
      if (!clientDocId) return;
      await firestore().collection("clients").doc(clientDocId).update({
        firstName,
        lastName,
        bio,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleChangePhoto = async () => {
    if (!clientDocId || !profile) return;
    console.log("TYTYHT");
    console.log("AUTH UID:", auth().currentUser?.uid);
    console.log("AUTH TOKEN:", await auth().currentUser?.getIdToken());

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Gallery access is needed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploading(true);

      const imageUri = result.assets[0].uri;
      const compressedUri = await compressImage(imageUri);
      // ✅ CORRECT call (ONE argument)
      const downloadURL = await uploadImage(compressedUri, "avatar");

      // 🔥 Save URL in Firestore
      await firestore().collection("clients").doc(clientDocId).update({
        profilePicture: downloadURL,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // ✅ Update UI instantly
      setProfile((prev) =>
        prev ? { ...prev, profilePicture: downloadURL } : prev
      );
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
      Image.prefetch("");
    }
  };

  const pickBugImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Gallery access is needed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ OK in your SDK
      allowsEditing: false, // 🔑 THIS FIXES THE CRASH
      quality: 0.8,
    });

    if (result.canceled) return;

    if (!result.assets || !result.assets[0]?.uri) {
      Alert.alert("Error", "Failed to load image");
      return;
    }

    setBugImage(result.assets[0].uri);
  };

  const submitBugReport = async () => {
    if (!uid || !profile || !clientDocId) return;

    if (!bugDescription.trim()) {
      Alert.alert("Missing info", "Please describe the issue.");
      return;
    }

    try {
      setSubmittingBug(true);

      let screenshotUrl: string | null = null;

      if (bugImage) {
        const compressed = await compressImage(bugImage);
        screenshotUrl = await uploadBugImage(compressed);
      }

      const bug: BugDoc = {
        description: bugDescription.trim(),
        screenshotUrl: screenshotUrl ? screenshotUrl : " ",

        reporterId: clientDocId, // ✅ FIXED
        authUid: uid,

        app: {
          platform: Platform.OS === "ios" ? "ios" : "android",
          appVersion: Constants.expoConfig?.version ?? "unknown",
        },

        context: {
          screen: "ProfileScreen",
        },

        status: "open",
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("bugs").add(bug);

      Alert.alert("Thanks 🙏", "Bug reported successfully.");

      setBugDescription("");
      setBugImage(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmittingBug(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, section === "account" && styles.activeTab]}
              onPress={() => setSection("account")}
            >
              <Text
                style={[
                  typography.button,
                  styles.tabText,
                  section === "account" && styles.activeTabText,
                ]}
              >
                Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                section === "preferences" && styles.activeTab,
              ]}
              onPress={() => setSection("preferences")}
            >
              <Text
                style={[
                  typography.button,
                  styles.tabText,
                  section === "account" && styles.activeTabText,
                ]}
              >
                Preferences
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, section === "bug" && styles.activeTab]}
              onPress={() => setSection("bug")}
            >
              <Text
                style={[
                  typography.button,
                  styles.tabText,
                  section === "account" && styles.activeTabText,
                ]}
              >
                Report bug
              </Text>
            </TouchableOpacity>
          </View>
          {section === "account" && (
            <>
              <Text style={[typography.heading, { color: colors.textPrimary }]}>
                Account Information
              </Text>
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={handleChangePhoto}
                  disabled={uploading}
                >
                  <View style={styles.avatarWrapper}>
                    {uploading && (
                      <View style={styles.avatarOverlay}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    )}

                    <Image
                      source={
                        profile.profilePicture
                          ? { uri: profile.profilePicture }
                          : require("../../assets/images/avatar-placeholder.png")
                      }
                      style={styles.avatar}
                    />
                  </View>

                  <Text style={[typography.small, { color: colors.primary }]}>
                    {uploading ? "Uploading..." : "Change photo"}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* NAME */}
              <>
                <Text
                  style={[typography.small, { color: colors.textSecondary }]}
                >
                  First name
                </Text>
                <Text
                  style={[typography.bodyMedium, { color: colors.textPrimary }]}
                >
                  {firstName}
                </Text>

                <Text
                  style={[typography.small, { color: colors.textSecondary }]}
                >
                  Last name
                </Text>
                <Text
                  style={[typography.bodyMedium, { color: colors.textPrimary }]}
                >
                  {lastName}
                </Text>
              </>
              {/* BIO */}
              <Text style={[typography.small, { color: colors.textSecondary }]}>
                Bio
              </Text>
              <TextInput
                style={[styles.input, typography.body, { height: 80 }]}
                multiline
                value={bio}
                onChangeText={setBio}
              />
              {/* PHONE */}
              <Text style={[typography.small, { color: colors.textSecondary }]}>
                Phone
              </Text>
              <Text
                style={[typography.bodyMedium, { color: colors.textPrimary }]}
              >
                {profile.phone}
              </Text>
              <AppButton title="Save changes" onPress={handleSave} />
            </>
          )}
          {section === "preferences" && (
            <>
              <Text style={[typography.heading, { color: colors.textPrimary }]}>
                Preferences
              </Text>

              <View style={styles.row}>
                <Text
                  style={[typography.small, { color: colors.textSecondary }]}
                >
                  Notifications
                </Text>

                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  disabled={savingNotif}
                  trackColor={{
                    false: "#374151",
                    true: colors.primary,
                  }}
                  thumbColor={
                    Platform.OS === "android" ? colors.primary : undefined
                  }
                />
              </View>

              <Text style={[typography.small, { color: colors.textSecondary }]}>
                You’ll be able to control detailed notification types here
                later.
              </Text>
            </>
          )}
          {section === "bug" && (
            <>
              <Text style={[typography.heading, { color: colors.textPrimary }]}>
                Report a bug
              </Text>

              <TextInput
                style={[styles.input, typography.body, { height: 80 }]}
                multiline
                placeholder="Describe what went wrong…"
                placeholderTextColor={colors.textSecondary}
                value={bugDescription}
                onChangeText={setBugDescription}
              />

              <TouchableOpacity
                style={styles.bugImagePicker}
                onPress={pickBugImage}
              >
                {bugImage ? (
                  <Image source={{ uri: bugImage }} style={styles.bugImage} />
                ) : (
                  <Text
                    style={[typography.small, { color: colors.textSecondary }]}
                  >
                    + Add screenshot (optional)
                  </Text>
                )}
              </TouchableOpacity>

              <AppButton
                title={submittingBug ? "Sending…" : "Send report"}
                onPress={submitBugReport}
                disabled={submittingBug}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40, // 👈 ensures Save button is always reachable
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 8,
  },
  readonly: {
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
  },
  changePhoto: {
    color: colors.primary,
    marginTop: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  avatarWrapper: {
    position: "relative",
  },

  avatarOverlay: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 10,
    marginBottom: 24,
    overflow: "hidden",
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },

  activeTab: {
    backgroundColor: colors.primary,
  },

  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },

  activeTabText: {
    color: "#fff",
  },

  paragraph: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  bugEmail: {
    color: colors.primary,
    fontWeight: "700",
    marginTop: 8,
  },

  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  bugImagePicker: {
    backgroundColor: colors.card,
    borderRadius: 12,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    overflow: "hidden",
  },

  bugImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
