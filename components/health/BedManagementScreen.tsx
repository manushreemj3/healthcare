import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useHealth } from "@/lib/health/store";
import { useUserAuth } from "@/lib/health/DoctorAuthContext";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type Props = {
  facilityId: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function BedManagementScreen({ facilityId }: Props) {
  const { getFacilityUnits, getBedsByUnit, addWard, occupyBed, releaseBed } = useHealth();
  const { role } = useUserAuth();
  const isChief = role === "chief_doctor";
  const canUpdateBeds = role === "asha_worker" || role === "receptionist" || role === "doctor" || role === "chief_doctor";

  // Add ward form
  const [wardName, setWardName] = useState("");
  const [bedCount, setBedCount] = useState("");
  const [adding, setAdding] = useState(false);

  const units = getFacilityUnits(facilityId);

  const handleAddWard = () => {
    const count = parseInt(bedCount, 10);
    if (!wardName.trim()) {
      Alert.alert("Missing Info", "Please enter a ward name.");
      return;
    }
    if (!bedCount.trim() || isNaN(count) || count < 1 || count > 200) {
      Alert.alert("Missing Info", "Please enter a valid bed count (1–200).");
      return;
    }
    addWard(wardName.trim(), count);
    setWardName("");
    setBedCount("");
    setAdding(false);
  };

  const totalBeds = units.reduce((sum, u) => sum + getBedsByUnit(u.id).length, 0);
  const occupiedBeds = units.reduce(
    (sum, u) => sum + getBedsByUnit(u.id).filter((b) => b.status === "occupied").length,
    0,
  );
  const availableBeds = totalBeds - occupiedBeds;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Bar */}
      <View style={styles.summaryRow}>
        <SummaryPill icon="hotel" value={String(totalBeds)} label="Total Beds" color="#2369A5" />
        <SummaryPill icon="check-circle" value={String(availableBeds)} label="Available" color="#198754" />
        <SummaryPill icon="people" value={String(occupiedBeds)} label="Occupied" color="#B42318" />
      </View>

      {/* Add Ward — Chief Doctor only */}
      {isChief && (
        <View style={styles.card}>
          {adding ? (
            <>
              <Text style={styles.cardTitle}>Add New Ward</Text>
              <Text style={styles.inputLabel}>Ward Name</Text>
              <TextInput
                value={wardName}
                onChangeText={setWardName}
                placeholder="e.g. Ward 1, Maternity Ward"
                placeholderTextColor="#8CA19B"
                style={styles.input}
                autoFocus
              />
              <Text style={styles.inputLabel}>Number of Beds</Text>
              <TextInput
                value={bedCount}
                onChangeText={setBedCount}
                placeholder="e.g. 20"
                placeholderTextColor="#8CA19B"
                keyboardType="numeric"
                style={styles.input}
              />
              {bedCount.trim() && !isNaN(parseInt(bedCount, 10)) && parseInt(bedCount, 10) > 0 && (
                <View style={styles.previewBox}>
                  <MaterialIcons name="bed" size={16} color="#087E7B" />
                  <Text style={styles.previewText}>
                    This will create {bedCount} beds, each with a checkbox to mark occupied/available.
                  </Text>
                </View>
              )}
              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => { setAdding(false); setWardName(""); setBedCount(""); }}
                  style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddWard}
                  style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Add Ward</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              onPress={() => setAdding(true)}
              style={({ pressed }) => [styles.addWardBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialIcons name="add-circle-outline" size={20} color="#087E7B" />
              <Text style={styles.addWardBtnText}>Add Ward</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* No wards state */}
      {units.length === 0 && (
        <View style={styles.emptyCard}>
          <MaterialIcons name="hotel" size={40} color="#D5E1DD" />
          <Text style={styles.emptyTitle}>No Wards Set Up</Text>
          <Text style={styles.emptyText}>
            {isChief
              ? "Tap \"Add Ward\" above to create a ward and specify the number of beds."
              : "The Chief Doctor hasn't set up any wards yet."}
          </Text>
        </View>
      )}

      {/* Ward cards with bed checkboxes */}
      {units.map((unit) => {
        const beds = getBedsByUnit(unit.id);
        const occupied = beds.filter((b) => b.status === "occupied").length;
        const available = beds.length - occupied;
        const pct = beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0;

        return (
          <View key={unit.id} style={styles.wardCard}>
            {/* Ward header */}
            <View style={styles.wardHeader}>
              <View>
                <Text style={styles.wardName}>{unit.name}</Text>
                <Text style={styles.wardStats}>
                  {available} available · {occupied} occupied · {pct}% full
                </Text>
              </View>
              <View style={[styles.occupancyBadge, { backgroundColor: pct >= 80 ? "#FDECEC" : "#EEF6F0" }]}>
                <Text style={[styles.occupancyBadgeText, { color: pct >= 80 ? "#B42318" : "#198754" }]}>
                  {pct}%
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${pct}%` as any,
                    backgroundColor: pct >= 80 ? "#B42318" : pct >= 50 ? "#9A5B00" : "#198754",
                  },
                ]}
              />
            </View>

            {/* Bed checkboxes */}
            <View style={styles.bedGrid}>
              {beds.map((bed) => {
                const isOccupied = bed.status === "occupied";
                return (
                  <Pressable
                    key={bed.id}
                    onPress={() => {
                      if (!canUpdateBeds) return;
                      if (isOccupied) {
                        releaseBed(bed.id);
                      } else {
                        occupyBed(bed.id, "unassigned");
                      }
                    }}
                    style={({ pressed }) => [
                      styles.bedBox,
                      isOccupied && styles.bedBoxOccupied,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View style={[styles.checkbox, isOccupied && styles.checkboxOccupied]}>
                      {isOccupied && <MaterialIcons name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={[styles.bedLabel, isOccupied && styles.bedLabelOccupied]}>
                      {bed.bedNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!canUpdateBeds ? (
              <Text style={styles.readOnlyNote}>
                Only doctors and ASHA workers can update bed status.
              </Text>
            ) : (
              <Text style={styles.readOnlyNote}>
                Tap any bed number to toggle occupied / available status.
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Summary Pill
// ──────────────────────────────────────────────────────────────────────────────

function SummaryPill({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.pill, { borderColor: color + "44" }]}>
      <MaterialIcons name={icon} size={18} color={color} />
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F5" },
  content: { padding: 14, paddingBottom: 40, gap: 12 },
  summaryRow: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1, alignItems: "center", backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1.5, gap: 2, padding: 12,
  },
  pillValue: { fontSize: 22, fontWeight: "900" },
  pillLabel: { color: "#6C817C", fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#18332F", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardTitle: { color: "#18332F", fontSize: 17, fontWeight: "900", marginBottom: 12 },
  inputLabel: { color: "#4A6560", fontSize: 12, fontWeight: "800", marginTop: 10, marginBottom: 5 },
  input: {
    backgroundColor: "#F7FAF9", borderColor: "#D5E1DD", borderRadius: 12, borderWidth: 1,
    color: "#18332F", fontSize: 15, minHeight: 48, paddingHorizontal: 14,
  },
  previewBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#E6F5F3", borderRadius: 10, padding: 10, marginTop: 10,
  },
  previewText: { color: "#087E7B", fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 17 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 12, borderWidth: 1.5, borderColor: "#D5E1DD", minHeight: 46,
  },
  cancelBtnText: { color: "#6C817C", fontSize: 14, fontWeight: "800" },
  addBtn: {
    flex: 2, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6,
    backgroundColor: "#087E7B", borderRadius: 12, minHeight: 46,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  addWardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48,
  },
  addWardBtnText: { color: "#087E7B", fontSize: 15, fontWeight: "900" },
  emptyCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 10,
  },
  emptyTitle: { color: "#18332F", fontSize: 17, fontWeight: "900" },
  emptyText: { color: "#6C817C", fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 19 },
  wardCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    shadowColor: "#18332F", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    gap: 10,
  },
  wardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  wardName: { color: "#18332F", fontSize: 16, fontWeight: "900" },
  wardStats: { color: "#6C817C", fontSize: 12, fontWeight: "700", marginTop: 2 },
  occupancyBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  occupancyBadgeText: { fontSize: 13, fontWeight: "900" },
  progressBg: { height: 6, backgroundColor: "#E7EEEB", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 999 },
  bedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  bedBox: {
    width: 44, alignItems: "center", gap: 3,
    backgroundColor: "#EEF6F0", borderRadius: 8, borderWidth: 1, borderColor: "#C3DECA", padding: 6,
  },
  bedBoxOccupied: { backgroundColor: "#FDECEC", borderColor: "#F4ABAB" },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: "#198754",
    alignItems: "center", justifyContent: "center",
  },
  checkboxOccupied: { backgroundColor: "#B42318", borderColor: "#B42318" },
  bedLabel: { color: "#198754", fontSize: 10, fontWeight: "800" },
  bedLabelOccupied: { color: "#B42318" },
  readOnlyNote: { color: "#8CA19B", fontSize: 11, fontWeight: "600", marginTop: 4 },
});
