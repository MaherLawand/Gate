import AnimatedAppear from "@/src/components/AnimatedAppear";
import PackageSkeleton from "@/src/components/skeletons/Packages/PackageSkeleton";
import { typography } from "@/src/theme/typography";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import AppButton from "../../../../src/components/AppButton";
import {
  addClientPackage,
  cancelPackage,
  getClientPackages,
  reactivatePackage,
  renewPackage,
  updatePackage,
} from "../../../../src/services/ClientService";
import {
  doc,
  getDoc,
  serverTimestamp,
} from "../../../../src/services/fireStoreHelpers";
import { colors } from "../../../../src/theme/colors";
import { ClientPackage } from "../../../../src/types/models";

export default function PackagesScreen() {
  const { id, expired } = useLocalSearchParams<{
    id: string;
    expired?: string;
  }>();

  /* ------------------ STATE ------------------ */
  const sheetRef = useRef<ActionSheetRef>(null);
  const [client, setClient] = useState<any>(null);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [activePackage, setActivePackage] = useState<ClientPackage | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [packagePrice, setPackagePrice] = useState("");
  const [packageSessions, setPackageSessions] = useState("");
  const [packagePaid, setPackagePaid] = useState(false);
  const [editingPackage, setEditingPackage] = useState(false);
  const [originalPackage, setOriginalPackage] = useState<{
    price: string;
    paid: boolean;
    sessions: string;
  } | null>(null);
  const hasUnsavedPackageChanges = originalPackage
    ? packagePrice !== originalPackage.price ||
      packagePaid !== originalPackage.paid ||
      (!editingPackage && packageSessions !== originalPackage.sessions)
    : false;

  const isSubmittingRef = useRef(false);
  const allowCloseRef = useRef(false);

  const resetPackageState = () => {
    setPackagePrice("");
    setPackageSessions("");
    setPackagePaid(false);
    setEditingPackage(false);
  };

  const [highlightAddPackage, setHighlightAddPackage] = useState(false);
  const [metaHint, setMetaHint] = useState<{
    packageId: string;
    text: string;
  } | null>(null);
  const formatDate = (ts?: any) => {
    if (!ts?.toDate) return null;
    return ts.toDate().toISOString().split("T")[0];
  };
  useEffect(() => {
    if (!metaHint) return;
    const t = setTimeout(() => setMetaHint(null), 2200);
    return () => clearTimeout(t);
  }, [metaHint]);
  /* ------------------ DERIVED ------------------ */

  const latestPackage = packages.length
    ? [...packages].sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() ?? new Date(0);
        const bDate = b.createdAt?.toDate?.() ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      })[0]
    : null;

  const needsRenewal = latestPackage?.status === "completed";

  /* ------------------ EFFECTS ------------------ */

  useEffect(() => {
    if (expired === "1") {
      Alert.alert(
        "Package expired",
        "This client has no remaining sessions. Please add a new package."
      );

      setHighlightAddPackage(true);
      const t = setTimeout(() => setHighlightAddPackage(false), 2000);
      return () => clearTimeout(t);
    }
  }, [expired]);

  useEffect(() => {
    fetchClient();
    fetchPackages();
  }, [id]);

  /* ------------------ FETCHERS ------------------ */

  const fetchClient = async () => {
    if (!id) return;
    const clientSnap = await getDoc(doc("clients", id));
    if (clientSnap.exists()) setClient(clientSnap.data());
  };

  const fetchPackages = async () => {
    if (!id) return;
    setLoading(true);
    const all = await getClientPackages(id);
    setPackages(all);
    setActivePackage(all.find((p) => p.status === "active") ?? null);
    setTimeout(() => {
      setLoading(false);
    }, 1300);
  };

  /* ------------------ ACTIONS ------------------ */

  const handleAddPackage = async () => {
    if (!packagePrice || !packageSessions) {
      Alert.alert("Missing fields", "Fill all package fields");
      return;
    }

    await addClientPackage(id!, {
      price: Number(packagePrice),
      totalSessions: Number(packageSessions),
      sessionsRemaining: Number(packageSessions),
      isPaid: packagePaid,
    });

    sheetRef.current?.hide();
    setPackagePrice("");
    setPackageSessions("");
    setPackagePaid(false);

    fetchPackages();
  };

  const handleSavePackage = async () => {
    if (!packagePrice || !packageSessions) {
      Alert.alert("Missing fields");
      return;
    }
    const hasCancelled = packages.some((p) => p.status === "cancelled");
    isSubmittingRef.current = true;
    if (!editingPackage && hasCancelled) {
      if (Platform.OS === "web") {
        if (
          window.confirm(
            "Cancelled package exists. You must reactivate or resolve the cancelled package first."
          )
        )
          return;
      } else {
        Alert.alert(
          "Cancelled package exists",
          "You must reactivate or resolve the cancelled package first."
        );
        return;
      }
    }
    if (editingPackage && activePackage) {
      // EDIT existing package
      await updatePackage(id!, activePackage.id!, {
        price: Number(packagePrice),
        isPaid: packagePaid,
        paidAt: packagePaid ? serverTimestamp() : null,
      });
    } else {
      // RENEW (new package)
      await renewPackage(id!, {
        price: Number(packagePrice),
        totalSessions: Number(packageSessions),
        isPaid: packagePaid,
      });
    }

    allowCloseRef.current = true; // 👈 THIS IS THE KEY
    resetPackageState(); // 👈 CLEAN FIRST
    sheetRef.current?.hide();
    await fetchPackages();
  };

  const handleCancelPackage = () => {
    if (!activePackage || !id) return;

    const confirmCancel = async () => {
      await cancelPackage(id!, activePackage.id!);
      await fetchPackages();
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Cancel package?\n\nThis will stop future sessions but keep the package."
      );
      if (ok) confirmCancel();
    } else {
      Alert.alert(
        "Cancel package?",
        "This will stop future sessions but keep the package.",
        [
          { text: "No", style: "cancel" },
          {
            text: "Cancel Package",
            style: "destructive",
            onPress: confirmCancel,
          },
        ]
      );
    }
  };
  const handleReactivatePackage = (pkgId: string) => {
    if (!id) return;

    const confirmReactivate = async () => {
      await reactivatePackage(id!, pkgId);
      await fetchPackages(); // refresh list + activePackage
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Reactivate package?\n\nThis will make this package active again."
      );
      if (ok) confirmReactivate();
    } else {
      Alert.alert(
        "Reactivate package?",
        "This will make this package active again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reactivate",
            onPress: confirmReactivate,
          },
        ]
      );
    }
  };

  /* ------------------ RENDER ------------------ */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text style={[typography.heading, styles.title]}>Packages</Text>

      {needsRenewal && !loading && (
        <Text style={[typography.bodyMedium, styles.renewWarning]}>
          Package expired — renewal required
        </Text>
      )}
      {loading ? (
        <>
          <PackageSkeleton />
          <PackageSkeleton />
        </>
      ) : activePackage ? (
        <AnimatedAppear delay={40}>
          <View style={styles.packageCard}>
            <View style={styles.headerRow}>
              <View style={styles.packageInfo}>
                <Text style={[typography.bodyMedium, styles.packageText]}>
                  Sessions remaining:
                  <Text style={[typography.bodyMedium, styles.packageStrong]}>
                    {" "}
                    {activePackage.sessionsRemaining} /{" "}
                    {activePackage.totalSessions}
                  </Text>
                </Text>
                <Text style={[typography.small, styles.packageText]}>
                  Price: ${activePackage.price}
                </Text>

                <Text style={[typography.small, styles.packageText]}>
                  Created:
                  {activePackage.createdAt?.toDate
                    ? activePackage.createdAt
                        .toDate()
                        .toISOString()
                        .split("T")[0]
                    : "—"}
                </Text>
              </View>
              <View style={styles.cardActions}>
                {/* EDIT */}
                {activePackage.status === "active" && (
                  <TouchableOpacity
                    onPress={() => {
                      //check this out later
                      allowCloseRef.current = false; // 🔑 ADD THIS
                      setPackagePrice(String(activePackage.price));
                      setPackagePaid(activePackage.isPaid);
                      setPackageSessions(String(activePackage.totalSessions)); // ignored but safe
                      setEditingPackage(true);

                      setOriginalPackage({
                        price: String(activePackage.price),
                        paid: activePackage.isPaid,
                        sessions: String(activePackage.totalSessions),
                      });

                      sheetRef.current?.show();
                    }}
                    style={styles.iconBtn}
                  >
                    <Text style={styles.editIcon}>✎</Text>
                  </TouchableOpacity>
                )}

                {/* CANCEL */}
                {activePackage.status === "active" && (
                  <TouchableOpacity
                    onPress={handleCancelPackage}
                    style={styles.iconBtn}
                  >
                    <Text style={styles.cancelIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {metaHint?.packageId === activePackage.id && (
              <AnimatedAppear>
                <View style={styles.metaHint}>
                  <Text style={[typography.small, styles.metaHintText]}>
                    {metaHint?.text}
                  </Text>
                </View>
              </AnimatedAppear>
            )}
            <View style={styles.bottomSection}>
              <View style={styles.tagRow}>
                {/* PAYMENT */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={async () => {
                    if (activePackage.isPaid) {
                      const date = formatDate(activePackage.paidAt);
                      if (date) {
                        setMetaHint({
                          packageId: activePackage.id!,
                          text: `Paid on ${date}`,
                        });
                      }
                      return;
                    }

                    await updatePackage(id!, activePackage.id!, {
                      isPaid: true,
                      paidAt: serverTimestamp(),
                    });

                    fetchPackages();
                  }}
                >
                  <View
                    style={[
                      styles.paymentPill,
                      activePackage.isPaid
                        ? styles.paidPill
                        : styles.unpaidPill,
                    ]}
                  >
                    <Text
                      style={[
                        typography.small,
                        styles.paymentText,
                        activePackage.isPaid
                          ? styles.paidText
                          : styles.unpaidText,
                      ]}
                    >
                      {activePackage.isPaid ? "PAID" : "UNPAID"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* STATUS */}
                <View
                  style={styles.statusPill}
                  onTouchEnd={() => {
                    if (activePackage.status === "completed") {
                      const date = formatDate(activePackage.completedAt);
                      if (date) {
                        setMetaHint({
                          packageId: activePackage.id!,
                          text: `Completed on ${date}`,
                        });
                      }
                    }

                    if (activePackage.status === "cancelled") {
                      const date = formatDate(activePackage.cancelledAt);
                      if (date) {
                        setMetaHint({
                          packageId: activePackage.id!,
                          text: `Cancelled on ${date}`,
                        });
                      }
                    }
                  }}
                >
                  <View
                    style={[
                      styles.statusDot,
                      activePackage.status === "active"
                        ? styles.dotActive
                        : activePackage.status === "expired"
                        ? styles.dotExpired
                        : styles.dotWarning,
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {activePackage.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </AnimatedAppear>
      ) : (
        <View
          style={[
            highlightAddPackage && {
              borderWidth: 2,
              borderColor: colors.primary,
              borderRadius: 14,
              shadowColor: colors.primary,
              shadowOpacity: 0.8,
              shadowRadius: 10,
            },
          ]}
        >
          <AppButton
            title="+ Add Package"
            disabled={loading}
            onPress={() => {
              //check this out later
              allowCloseRef.current = false; // 🔑 ADD THIS
              setPackagePrice("");
              setPackageSessions("");
              setPackagePaid(false);
              setEditingPackage(false);

              setOriginalPackage({
                price: "",
                paid: false,
                sessions: "",
              });

              sheetRef.current?.show();
            }}
          />
        </View>
      )}

      <View style={{ marginTop: 24 }}>
        {packages.length >= 1 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[typography.title, styles.sectionTitle]}>
              Past Packages
            </Text>
            {loading ? (
              <>
                <PackageSkeleton />
                <PackageSkeleton />
              </>
            ) : (
              packages
                .filter((p) => p.status !== "active")
                .map((pkg, index) => (
                  <AnimatedAppear
                    key={pkg.id} // 👈 IMPORTANT
                    delay={index * 80 + 120} // 👈 staggered
                  >
                    <View
                      key={pkg.id}
                      style={[
                        styles.packageCard,
                        styles.pastPackage,
                        !pkg.isPaid && styles.unpaidHighlight,
                      ]}
                    >
                      <Text style={[typography.body, styles.packageText]}>
                        {pkg.totalSessions} sessions — ${pkg.price}
                      </Text>

                      <Text style={[typography.small, styles.packageText]}>
                        Created:
                        {pkg.createdAt?.toDate
                          ? pkg.createdAt.toDate().toISOString().split("T")[0]
                          : "—"}
                      </Text>
                      {metaHint?.packageId === pkg.id && (
                        <AnimatedAppear>
                          <View style={styles.metaHint}>
                            <Text
                              style={[typography.small, styles.metaHintText]}
                            >
                              {metaHint?.text}
                            </Text>
                          </View>
                        </AnimatedAppear>
                      )}
                      <View style={styles.bottomSection}>
                        <View style={styles.tagRow}>
                          {/* PAYMENT */}
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={async () => {
                              if (pkg.isPaid) {
                                const date = formatDate(pkg.paidAt);
                                if (date) {
                                  setMetaHint({
                                    packageId: pkg.id!,
                                    text: `Paid on ${date}`,
                                  });
                                }
                                return;
                              }

                              await updatePackage(id!, pkg.id!, {
                                isPaid: true,
                                paidAt: serverTimestamp(),
                              });

                              fetchPackages();
                            }}
                          >
                            <View
                              style={[
                                styles.paymentPill,
                                pkg.isPaid
                                  ? styles.paidPill
                                  : styles.unpaidPill,
                              ]}
                            >
                              <Text
                                style={[
                                  typography.small,
                                  styles.paymentText,
                                  pkg.isPaid
                                    ? styles.paidText
                                    : styles.unpaidText,
                                ]}
                              >
                                {pkg.isPaid ? "PAID" : "UNPAID"}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* STATUS */}
                          <View
                            style={styles.statusPill}
                            onTouchEnd={() => {
                              if (pkg.status === "completed") {
                                const date = formatDate(pkg.completedAt);
                                if (date) {
                                  setMetaHint({
                                    packageId: pkg.id!,
                                    text: `Completed on ${date}`,
                                  });
                                }
                              }

                              if (pkg.status === "cancelled") {
                                const date = formatDate(pkg.cancelledAt);
                                if (date) {
                                  setMetaHint({
                                    packageId: pkg.id!,
                                    text: `Cancelled on ${date}`,
                                  });
                                }
                              }
                            }}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                pkg.status === "active"
                                  ? styles.dotActive
                                  : pkg.status === "expired"
                                  ? styles.dotExpired
                                  : styles.dotWarning,
                              ]}
                            />
                            <Text style={[typography.small, styles.statusText]}>
                              {pkg.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {pkg.status === "cancelled" && (
                          <AppButton
                            title="Reactivate Package"
                            variant="small"
                            onPress={() => handleReactivatePackage(pkg.id!)}
                          />
                        )}
                      </View>
                    </View>
                  </AnimatedAppear>
                ))
            )}
          </View>
        )}
      </View>

      {/* ---------- MODAL ---------- */}
      <ActionSheet
        ref={sheetRef}
        closeOnTouchBackdrop
        gestureEnabled={!hasUnsavedPackageChanges}
        keyboardHandlerEnabled
        indicatorStyle={{ backgroundColor: colors.primary }}
        containerStyle={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
        }}
        onBeforeClose={() => {
          // ✅ Explicitly allowed close (save / discard)
          if (allowCloseRef.current) {
            allowCloseRef.current = false;
            return true;
          }

          // ✅ No unsaved changes → allow close
          if (!hasUnsavedPackageChanges) {
            return true;
          }

          // ❌ Unsaved changes → block close + alert
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
                  resetPackageState();
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
          contentContainerStyle={{ padding: 15, paddingBottom: 30 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <AnimatedAppear delay={240}>
                <Text style={[typography.heading, styles.title]}>
                  Add Package
                </Text>
              </AnimatedAppear>
              <AnimatedAppear delay={340}>
                <TextInput
                  style={[styles.input, editingPackage && styles.inputDisabled]}
                  placeholder="Total Sessions (e.g. 16)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={packageSessions}
                  onChangeText={setPackageSessions}
                  editable={!editingPackage}
                />
              </AnimatedAppear>
              <AnimatedAppear delay={340}>
                <TextInput
                  style={styles.input}
                  placeholder="Price (e.g. 240)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={packagePrice}
                  onChangeText={setPackagePrice}
                />
              </AnimatedAppear>
              <AnimatedAppear delay={440}>
                <AppButton
                  title={packagePaid ? "Paid ✓" : "Mark as Paid"}
                  onPress={() => setPackagePaid(!packagePaid)}
                />

                <AppButton
                  title={editingPackage ? "Update Package" : "Create Package"}
                  onPress={handleSavePackage}
                />
              </AnimatedAppear>
            </View>
          </View>
        </SheetScrollView>
      </ActionSheet>
    </ScrollView>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  bottomSection: {
    display: "flex",
    flexDirection: "column",
    marginTop: 5,
    gap: 10,
  },
  packageCard: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    flex: 1,
    flexDirection: "column", // 👈 REQUIRED

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  packageInfo: {
    display: "flex",
    flexDirection: "column",
    marginTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: "auto",
  },

  iconBtn: {
    padding: 6,
  },

  editIcon: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelIcon: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10, // 👈 modern spacing
    flexWrap: "wrap", // 👈 safe on small screens
  },
  paymentPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  paidPill: {
    backgroundColor: "#062e1a", // dark green bg
  },

  paidText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  unpaidPill: {
    backgroundColor: "#2a1f10", // dark amber bg
  },

  unpaidText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  title: {
    color: colors.textPrimary,
    marginBottom: 16,
  },
  packageStrong: {
    fontWeight: "600",
    fontSize: 14,
  },
  renewWarning: { color: "#ef4444", marginBottom: 12 },

  packageText: { color: colors.textPrimary, marginBottom: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 24,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  unpaidHighlight: {
    borderWidth: 2,
    borderColor: "#f59e0b", // amber
    backgroundColor: "#1f1a10",
  },
  unpaidBadge: {
    color: "#f59e0b",
    fontWeight: "700",
    marginBottom: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  activeGlow: {
    shadowColor: "#22c55e",
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  dotActive: { backgroundColor: "#22c55e" },
  dotExpired: { backgroundColor: "#ef4444" },
  dotWarning: { backgroundColor: "#f59e0b" },

  statusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  pastPackage: {
    opacity: 0.85,
    backgroundColor: "#0b1220",
  },

  metaBlock: {
    marginTop: 8,
    marginBottom: 14,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#111827",
    marginBottom: 6, // 👈 smaller, intentional gap
  },

  inputDisabled: {
    opacity: 0.5,
  },
  metaHint: {
    alignSelf: "flex-start",
    backgroundColor: "#020617",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,

    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },

  metaHintText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
});
