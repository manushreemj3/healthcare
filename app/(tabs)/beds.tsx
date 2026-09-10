import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useUserAuth } from "@/lib/health/DoctorAuthContext";
import { BedManagementScreen } from "@/components/health/BedManagementScreen";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function BedTrackerScreen() {
  const { user, role } = useUserAuth();
  const isChief = role === "chief_doctor";
  const canUpdateBeds = isChief || role === "doctor" || role === "asha_worker";

  const facilityId = user?.facilityId ?? "";
  const facilityName = user?.facilityName ?? "Hospital";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Bed Management</Text>
          <Text style={styles.headerSub}>{facilityName}</Text>
        </View>
        <View style={[styles.roleBadge, canUpdateBeds ? styles.chiefBadge : styles.staffBadge]}>
          <MaterialIcons
            name={canUpdateBeds ? "edit-location-alt" : "visibility"}
            size={14}
            color={canUpdateBeds ? "#087E7B" : "#2369A5"}
          />
          <Text style={[styles.roleBadgeText, canUpdateBeds ? { color: "#087E7B" } : { color: "#2369A5" }]}>
            {isChief ? "Chief Doctor" : canUpdateBeds ? "Update Access" : "View Only"}
          </Text>
        </View>
      </View>

      {/* No facility */}
      {!facilityId ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="hotel" size={48} color="#D5E1DD" />
          <Text style={styles.emptyTitle}>No Hospital Linked</Text>
          <Text style={styles.emptyText}>
            Sign in with a hospital account to manage beds.
          </Text>
        </View>
      ) : (
        <BedManagementScreen facilityId={facilityId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E0EBE7",
  },
  headerLeft: { gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#18332F" },
  headerSub: { fontSize: 12, fontWeight: "700", color: "#6C817C" },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5,
  },
  chiefBadge: { backgroundColor: "#E6F5F3", borderColor: "#087E7B" },
  staffBadge: { backgroundColor: "#EAF4FF", borderColor: "#2369A5" },
  roleBadgeText: { fontSize: 12, fontWeight: "800" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  emptyTitle: { color: "#18332F", fontSize: 18, fontWeight: "900" },
  emptyText: { color: "#6C817C", fontSize: 13, fontWeight: "600", textAlign: "center" },
});
