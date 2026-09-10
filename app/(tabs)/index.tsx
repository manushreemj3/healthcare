import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton, PriorityBadge, SectionHeader, SyncPill, commonStyles } from "@/components/health/ui";
import { useHealth } from "@/lib/health/store";
import { sortQueue } from "@/lib/health/workflows";
import { useUserAuth } from "@/lib/health/DoctorAuthContext";

export default function OperationsHome() {
  const { state, t, syncNow, syncing, syncError, setLanguage, priorityReasonLabel } = useHealth();
  const { user, role, doctor, healthWorker, signOut } = useUserAuth();

  // No patient role in the new system

  const handleSignOut = () => {
    signOut();
  };

  const activeQueue = sortQueue(state.queue.filter((item) => item.status !== "completed"));
  const highRisk = activeQueue.filter((item) => item.priority === "emergency" || item.priority === "urgent");
  const medicineAlerts = state.medicines.filter((item) => item.stock <= item.minimumStock || item.expiryDays < 30).length;
  const backlog = state.referrals.filter((item) => item.status !== "completed").length;
  const nextPatient = activeQueue[0];
  const nextPatientRecord = nextPatient ? state.patients.find((patient) => patient.id === nextPatient.patientId) : undefined;

  const userInitials = user?.name
    ? user.name.replace(/^Dr\.\s*/i, "").trim().slice(0, 2).toUpperCase()
    : "HC";

  const roleTitle =
    role === "chief_doctor" ? "Chief Doctor"
    : role === "doctor" ? "Doctor / Medical Officer"
    : role === "asha_worker" ? "ASHA Worker"
    : role === "receptionist" ? "Receptionist"
    : "Staff";
  const roleColor =
    role === "chief_doctor" ? "#087E7B"
    : role === "doctor" ? "#087E7B"
    : role === "asha_worker" ? "#B66A00"
    : "#6B3FA0";
  const roleBg =
    role === "chief_doctor" ? "#E6F5F3"
    : role === "doctor" ? "#E6F5F3"
    : role === "asha_worker" ? "#FFF4E5"
    : "#F3EEFF";

  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={commonStyles.eyebrow}>{user?.facilityName || "Nandipur Primary Health Centre"}</Text>
            <Text style={commonStyles.title}>{t("operations")}</Text>
          </View>
          <Pressable
            onPress={() => {
              const langs: ("en" | "hi" | "ta" | "mr")[] = ["en", "hi", "ta", "mr"];
              const next = langs[(langs.indexOf(state.language) + 1) % langs.length];
              setLanguage(next);
            }}
            style={({ pressed }) => [styles.language, { opacity: pressed ? 0.65 : 1 }]}
          >
            <MaterialIcons name="translate" size={17} color="#087E7B" />
            <Text style={styles.languageText}>
              {state.language === "en" ? "English" : state.language === "hi" ? "हिन्दी" : state.language === "ta" ? "தமிழ்" : "मराठी"}
            </Text>
          </Pressable>
        </View>

        {/* Multi-Role Active Profile Banner */}
        {user && (
          <View style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <View style={styles.flex}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.profileTitle}>{user.name}</Text>
                <View style={[styles.activeBadge, { backgroundColor: roleBg }]}>
                  <View style={[styles.activeDot, { backgroundColor: roleColor }]} />
                  <Text style={[styles.activeBadgeText, { color: roleColor }]}>{roleTitle}</Text>
                </View>
              </View>
              <Text style={styles.profileText}>
                {(role === "doctor" || role === "chief_doctor")
                  ? `${doctor?.specialization || "Medical Officer"} · ID: ${doctor?.doctorId || "DOC"}`
                  : `${healthWorker?.designation || "ASHA Worker"} · ${user?.facilityName || ""}`}
              </Text>
            </View>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signoutButton, { opacity: pressed ? 0.65 : 1 }]}
              accessibilityLabel="Sign out / Switch role"
            >
              <MaterialIcons name="logout" size={16} color="#B42318" />
              <Text style={styles.signoutText}>{t("signOut")}</Text>
            </Pressable>
          </View>
        )}

        {/* Offline Sync Bar */}
        <View style={styles.syncBar}>
          <View style={styles.syncIcon}>
            <MaterialIcons name="cloud-queue" size={19} color="#087E7B" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.syncTitle}>
              {state.operations.length ? `${state.operations.length} ${t("pendingChanges").toLowerCase()}` : t("offlineReady")}
            </Text>
            <Text style={commonStyles.tiny}>
              {t("lastSynced")}: {new Date(state.lastSyncedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}, {new Date(state.lastSyncedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <Pressable
            onPress={syncNow}
            disabled={syncing}
            style={({ pressed }) => [styles.syncButton, { opacity: syncing || pressed ? 0.58 : 1 }]}
          >
            <MaterialIcons name="sync" size={17} color="#087E7B" />
            <Text style={styles.syncButtonText}>{syncing ? "…" : t("syncNow")}</Text>
          </Pressable>
        </View>

        {syncError ? (
          <View style={styles.syncError}>
            <MaterialIcons name="cloud-off" size={18} color="#B42318" />
            <Text style={styles.syncErrorText}>Sync failed. Changes stay on this device and will retry when a network is available.</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push("/dashboard" as never)}
          style={({ pressed }) => [styles.dashboardLink, { opacity: pressed ? 0.65 : 1 }]}
        >
          <MaterialIcons name="bar-chart" size={18} color="#2369A5" />
          <View style={styles.flex}>
            <Text style={styles.dashboardLinkTitle}>{t("facilityDashboard")}</Text>
            <Text style={styles.dashboardLinkText}>Queue, referrals, medicines, and sync health</Text>
          </View>
          <MaterialIcons name="chevron-right" size={21} color="#2369A5" />
        </Pressable>

        {/* Chief Doctor Medicine Stock Alert */}
        {role === "chief_doctor" && medicineAlerts > 0 && (
          <View style={styles.chiefMedicineAlert}>
            <MaterialIcons name="warning-amber" size={24} color="#B42318" />
            <View style={styles.flex}>
              <Text style={styles.chiefAlertTitle}>🚨 CRITICAL MEDICINE ALERT (bsdk medicine illa)</Text>
              <Text style={styles.chiefAlertText}>
                {state.medicines
                  .filter((m) => m.stock <= m.minimumStock)
                  .map((m) => `${m.name} (stock: ${m.stock}/${m.minimumStock} ${m.unit})`)
                  .join(" · ")}
              </Text>
            </View>
          </View>
        )}

        {(role === "asha_worker" || role === "receptionist") && (
          <PrimaryButton label={t("registerPatient")} icon="person-add" onPress={() => router.push("/register" as never)} />
        )}

        <View style={styles.metrics}>
          <Metric icon="groups" value={String(activeQueue.length)} label={t("waitTime")} tone="#2369A5" />
          <Metric icon="health-and-safety" value={String(highRisk.length)} label={t("highRisk")} tone="#B42318" />
          <Metric icon="send" value={String(backlog)} label={t("referralBacklog")} tone="#B66A00" />
          <Metric icon="medication" value={String(medicineAlerts)} label={t("medicineAlerts")} tone="#198754" />
        </View>

        <SectionHeader
          title={t("currentQueue")}
          action={
            <Pressable onPress={() => router.push("/(tabs)/queue" as never)}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          }
        />

        {nextPatient && nextPatientRecord ? (
          <Pressable
            onPress={() => router.push(`/patient/${nextPatientRecord.id}` as never)}
            style={({ pressed }) => [commonStyles.card, styles.nextCard, { opacity: pressed ? 0.72 : 1 }]}
          >
            <View style={styles.nextTitleRow}>
              <View>
                <Text style={commonStyles.eyebrow}>Next patient</Text>
                <Text style={styles.nextName}>{nextPatientRecord.name}</Text>
              </View>
              <PriorityBadge priority={nextPatient.priority} />
            </View>
            <Text style={[commonStyles.body, { marginTop: 6 }]}>
              {nextPatient.service} · arrived {Math.max(1, Math.round((Date.now() - nextPatient.arrivedAt) / 60000))} min ago
            </Text>
            <Text style={styles.priorityReason}>{priorityReasonLabel(nextPatient.priorityReason)}</Text>
            <View style={styles.nextFooter}>
              <SyncPill state={nextPatient.syncState} />
              <Text style={styles.openText}>Open record</Text>
            </View>
          </Pressable>
        ) : (
          <View style={[commonStyles.card, styles.emptyCard]}>
            <Text style={commonStyles.body}>{t("noQueue")}</Text>
          </View>
        )}

        <View style={styles.safety}>
          <MaterialIcons name="info-outline" size={18} color="#9A5B00" />
          <View style={styles.flex}>
            <Text style={styles.safetyHeading}>{t("safety")}</Text>
            <Text style={styles.safetyText}>{t("riskNotice")}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({ icon, value, label, tone }: { icon: keyof typeof MaterialIcons.glyphMap; value: string; label: string; tone: string }) {
  return (
    <View style={styles.metric}>
      <MaterialIcons name={icon} color={tone} size={20} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36 },
  topBar: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  language: { alignItems: "center", backgroundColor: "#E6F5F3", borderRadius: 999, flexDirection: "row", gap: 5, minHeight: 34, paddingHorizontal: 10 },
  languageText: { color: "#087E7B", fontSize: 12, fontWeight: "900" },
  flex: { flex: 1 },
  syncBar: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, flexDirection: "row", gap: 9, marginBottom: 13, padding: 11 },
  syncIcon: { alignItems: "center", backgroundColor: "#E6F5F3", borderRadius: 10, height: 37, justifyContent: "center", width: 37 },
  syncTitle: { color: "#18332F", fontSize: 13, fontWeight: "900" },
  syncButton: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 35 },
  syncButtonText: { color: "#087E7B", fontSize: 12, fontWeight: "900" },
  syncError: { alignItems: "center", backgroundColor: "#FDECEC", borderRadius: 13, flexDirection: "row", gap: 9, marginBottom: 13, padding: 12 },
  syncErrorText: { color: "#B42318", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  dashboardLink: { alignItems: "center", backgroundColor: "#EAF4FF", borderRadius: 14, flexDirection: "row", gap: 9, marginBottom: 10, padding: 11 },
  dashboardLinkTitle: { color: "#2369A5", fontSize: 13, fontWeight: "900" },
  dashboardLinkText: { color: "#4C78A0", fontSize: 11, fontWeight: "700", marginTop: 2 },
  chiefMedicineAlert: { alignItems: "center", backgroundColor: "#FDECEC", borderColor: "#F5C2C2", borderWidth: 1.5, borderRadius: 14, flexDirection: "row", gap: 10, marginBottom: 12, padding: 12 },
  chiefAlertTitle: { color: "#B42318", fontSize: 13, fontWeight: "900" },
  chiefAlertText: { color: "#7A1C14", fontSize: 12, fontWeight: "700", marginTop: 2 },
  profileCard: { alignItems: "center", backgroundColor: "#E6F5F3", borderRadius: 15, flexDirection: "row", gap: 10, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: "#CFE9E4" },
  avatar: { alignItems: "center", backgroundColor: "#087E7B", borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  doctorNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileTitle: { color: "#18332F", fontSize: 14, fontWeight: "900" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D2EFE9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#198754" },
  activeBadgeText: { color: "#087E7B", fontSize: 10, fontWeight: "800" },
  profileText: { color: "#4F8A85", fontSize: 11, fontWeight: "700", marginTop: 2 },
  signoutButton: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 35, paddingHorizontal: 6, backgroundColor: "#FDECEC", borderRadius: 8, paddingVertical: 4 },
  signoutText: { color: "#B42318", fontSize: 12, fontWeight: "900" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginVertical: 20 },
  metric: { backgroundColor: "#FFFFFF", borderRadius: 15, flexGrow: 1, flexBasis: "45%", minHeight: 112, padding: 12 },
  metricValue: { color: "#18332F", fontSize: 27, fontWeight: "900", marginTop: 8 },
  metricLabel: { color: "#6C817C", fontSize: 12, fontWeight: "700", marginTop: 1 },
  link: { color: "#087E7B", fontSize: 13, fontWeight: "900" },
  nextCard: { marginBottom: 20 },
  nextTitleRow: { flexDirection: "row", justifyContent: "space-between" },
  nextName: { color: "#18332F", fontSize: 20, fontWeight: "900", marginTop: 2 },
  priorityReason: { color: "#B66A00", fontSize: 12, fontWeight: "800", marginTop: 7 },
  nextFooter: { alignItems: "center", borderTopColor: "#E7EEEB", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 13, paddingTop: 11 },
  openText: { color: "#087E7B", fontSize: 12, fontWeight: "900" },
  emptyCard: { marginBottom: 20 },
  safety: { alignItems: "flex-start", backgroundColor: "#FFF4E5", borderRadius: 15, flexDirection: "row", gap: 9, padding: 13 },
  safetyHeading: { color: "#9A5B00", fontSize: 12, fontWeight: "900", marginBottom: 2 },
  safetyText: { color: "#9A5B00", fontSize: 12, fontWeight: "700", lineHeight: 18 },
});
