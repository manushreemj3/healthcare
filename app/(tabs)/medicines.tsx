import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View, Modal, TextInput, TouchableOpacity } from "react-native";
import { SyncPill, commonStyles } from "@/components/health/ui";
import { useHealth } from "@/lib/health/store";
import { useUserAuth } from "@/lib/health/DoctorAuthContext";
import type { Medicine } from "@/lib/health/types";

export default function MedicinesScreen() {
  const { state, t, recordInventoryTransaction, addMedicine } = useHealth();
  const { role, user } = useUserAuth();
  const canManageMedicines = role === "asha_worker" || role === "receptionist" || role === "doctor" || role === "chief_doctor";
  const [selected, setSelected] = useState<Medicine | undefined>();

  // Custom quantity adjustment modal state
  const [adjustingMed, setAdjustingMed] = useState<{ medicine: Medicine; type: "receipt" | "dispense" } | null>(null);
  const [customQty, setCustomQty] = useState("");

  // Add Medicine State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedLocalName, setNewMedLocalName] = useState("");
  const [newMedCategory, setNewMedCategory] = useState("");
  const [newMedUnit, setNewMedUnit] = useState("");
  const [newMedMinStock, setNewMedMinStock] = useState("");

  // Filter medicines by user facility so each hospital has separate stock
  const userFacilityId = user?.facilityId;
  const medicines = state.medicines
    .filter((m) => !m.facilityId || !userFacilityId || m.facilityId === userFacilityId)
    .sort((a, b) => (a.stock <= a.minimumStock ? -1 : 1) - (b.stock <= b.minimumStock ? -1 : 1));

  const handleConfirmAdjust = () => {
    if (!adjustingMed) return;
    const qty = parseInt(customQty.trim(), 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number.");
      return;
    }

    recordInventoryTransaction(adjustingMed.medicine.id, adjustingMed.type, qty);
    const updatedStock = adjustingMed.type === "receipt" ? adjustingMed.medicine.stock + qty : Math.max(0, adjustingMed.medicine.stock - qty);
    
    Alert.alert(
      "Stock Updated",
      `${adjustingMed.medicine.name} ${adjustingMed.type === "receipt" ? "received" : "dispensed"} ${qty} ${adjustingMed.medicine.unit}. New stock: ${updatedStock}`
    );

    setAdjustingMed(null);
    setCustomQty("");
  };

  const handleAddMedicine = () => {
    if (!newMedName.trim() || !newMedCategory.trim() || !newMedUnit.trim()) {
      Alert.alert("Error", "Name, Category, and Unit are required.");
      return;
    }
    addMedicine({
      name: newMedName.trim(),
      localName: newMedLocalName.trim() || undefined,
      category: newMedCategory.trim(),
      unit: newMedUnit.trim(),
      minimumStock: parseInt(newMedMinStock) || 0,
    });
    setIsAddModalVisible(false);
    setNewMedName("");
    setNewMedLocalName("");
    setNewMedCategory("");
    setNewMedUnit("");
    setNewMedMinStock("");
    Alert.alert("Success", "Medicine added to hospital inventory.");
  };

  return (
    <View style={commonStyles.screen}>
      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={commonStyles.eyebrow}>{user?.facilityName || "Hospital Pharmacy"}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <Text style={commonStyles.title}>{t("medicines")}</Text>
              {canManageMedicines && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setIsAddModalVisible(true)}
                >
                  <MaterialIcons name="add-circle" size={24} color="#087E7B" />
                  <Text style={styles.addButtonText}>Add Medicine</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.alert}>
              <MaterialIcons name="inventory-2" size={19} color="#9A5B00" />
              <Text style={styles.alertText}>
                {medicines.filter((item) => item.stock <= item.minimumStock).length} medicines need stock attention
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(selected?.id === item.id ? undefined : item)}
            style={({ pressed }) => [commonStyles.card, styles.card, { opacity: pressed ? 0.72 : 1 }]}
          >
            <View style={styles.top}>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={commonStyles.tiny}>
                  {item.localName} · {item.unit}
                </Text>
              </View>
              <StockBadge medicine={item} />
            </View>
            <View style={styles.stockRow}>
              <Text style={styles.stockNumber}>{item.stock}</Text>
              <Text style={styles.stockUnit}>{item.unit}</Text>
              <View style={styles.flex} />
              <Text style={styles.expiry}>
                {item.expiryDays < 30 ? `Expires in ${item.expiryDays} days` : `Min. ${item.minimumStock}`}
              </Text>
            </View>
            <View style={styles.bottom}>
              <SyncPill state={item.syncState} />
              <Text style={styles.stale}>
                {item.syncState === "synced" ? t("stockAvailable") : t("staleStock")}
              </Text>
            </View>
            {selected?.id === item.id && canManageMedicines && (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => { setAdjustingMed({ medicine: item, type: "receipt" }); setCustomQty("10"); }}
                  style={({ pressed }) => [styles.stockAction, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <MaterialIcons name="add-circle-outline" size={17} color="#087E7B" />
                  <Text style={styles.stockActionText}>Received Stock (+)</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setAdjustingMed({ medicine: item, type: "dispense" }); setCustomQty("1"); }}
                  disabled={item.stock === 0}
                  style={({ pressed }) => [
                    styles.stockAction,
                    { opacity: item.stock === 0 ? 0.35 : pressed ? 0.65 : 1 },
                  ]}
                >
                  <MaterialIcons name="remove-circle-outline" size={17} color="#087E7B" />
                  <Text style={styles.stockActionText}>Dispensed (−)</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}
      />

      {/* Custom Quantity Stock Update Modal */}
      <Modal visible={!!adjustingMed} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {adjustingMed?.type === "receipt" ? "Receive Stock (+)" : "Dispense Stock (−)"}
            </Text>
            <Text style={{ color: "#6C817C", fontSize: 13, marginBottom: 12, fontWeight: "600" }}>
              {adjustingMed?.medicine.name} (Current: {adjustingMed?.medicine.stock} {adjustingMed?.medicine.unit})
            </Text>
            <Text style={styles.readOnlyNoteText}>Enter Amount ({adjustingMed?.medicine.unit}):</Text>
            <TextInput
              style={[styles.input, { fontSize: 18, fontWeight: "bold", marginVertical: 8 }]}
              placeholder="e.g. 25"
              value={customQty}
              onChangeText={setCustomQty}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmAdjust}>
              <Text style={styles.primaryBtnText}>Update Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setAdjustingMed(null); setCustomQty(""); }}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add New Medicine</Text>
            <TextInput
              style={styles.input}
              placeholder="Medicine Name"
              value={newMedName}
              onChangeText={setNewMedName}
            />
            <TextInput
              style={styles.input}
              placeholder="Local Name (Optional)"
              value={newMedLocalName}
              onChangeText={setNewMedLocalName}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g. antibiotic, chronic)"
              value={newMedCategory}
              onChangeText={setNewMedCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Unit (e.g. tablets, bottles)"
              value={newMedUnit}
              onChangeText={setNewMedUnit}
            />
            <TextInput
              style={styles.input}
              placeholder="Minimum Stock Level"
              value={newMedMinStock}
              onChangeText={setNewMedMinStock}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddMedicine}>
              <Text style={styles.primaryBtnText}>Add to Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setIsAddModalVisible(false)}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StockBadge({ medicine }: { medicine: Medicine }) {
  const isOut = medicine.stock === 0;
  const isLow = medicine.stock > 0 && medicine.stock <= medicine.minimumStock;
  const label = isOut ? "Out of stock" : isLow ? "Low stock" : "Available";
  const tone = isOut
    ? { background: "#FDECEC", text: "#B42318", icon: "error-outline" as const }
    : isLow
    ? { background: "#FFF4E5", text: "#9A5B00", icon: "warning-amber" as const }
    : { background: "#EEF6F0", text: "#198754", icon: "check-circle" as const };
  return (
    <View style={[styles.badge, { backgroundColor: tone.background }]}>
      <MaterialIcons name={tone.icon} size={14} color={tone.text} />
      <Text style={[styles.badgeText, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36, gap: 10 },
  alert: { alignItems: "center", backgroundColor: "#FFF4E5", borderRadius: 13, flexDirection: "row", gap: 8, marginBottom: 7, padding: 12 },
  alertText: { color: "#9A5B00", fontSize: 13, fontWeight: "900" },
  card: { marginTop: 3 },
  top: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  flex: { flex: 1 },
  name: { color: "#18332F", fontSize: 16, fontWeight: "900" },
  badge: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "900" },
  stockRow: { alignItems: "flex-end", flexDirection: "row", marginTop: 13 },
  stockNumber: { color: "#18332F", fontSize: 28, fontWeight: "900" },
  stockUnit: { color: "#6C817C", fontSize: 12, fontWeight: "800", marginBottom: 5, marginLeft: 5 },
  expiry: { color: "#B66A00", fontSize: 11, fontWeight: "800", marginBottom: 6 },
  bottom: { alignItems: "center", borderTopColor: "#E7EEEB", borderTopWidth: 1, flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 10 },
  stale: { color: "#6C817C", fontSize: 11, fontWeight: "700" },
  actions: { borderTopColor: "#E7EEEB", borderTopWidth: 1, flexDirection: "row", gap: 10, marginTop: 12, paddingTop: 11 },
  stockAction: { alignItems: "center", backgroundColor: "#E6F5F3", borderRadius: 10, flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", minHeight: 38 },
  stockActionText: { color: "#087E7B", fontSize: 12, fontWeight: "900" },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E6F5F3", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#BEE6E2" },
  addButtonText: { color: "#087E7B", fontSize: 12, fontWeight: "900" },
  readOnlyNote: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#EAF4FF", borderRadius: 10, padding: 10, marginBottom: 10 },
  readOnlyNoteText: { color: "#2369A5", fontSize: 12, fontWeight: "700", flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modal: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, color: "#1a1a1a" },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  primaryBtn: { backgroundColor: "#087E7B", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 8 },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: 14 },
  secondaryBtn: { padding: 12, borderRadius: 8, alignItems: "center" },
  secondaryBtnText: { color: "#6C817C", fontWeight: "700", fontSize: 14 },
});
