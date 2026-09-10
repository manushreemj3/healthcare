import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserAuth } from "@/lib/health/DoctorAuthContext";
import { type UserRole } from "@/lib/health/userAuth";
import {
  getHospitals,
  registerHospital,
  type HospitalRecord,
} from "@/lib/health/hospitalRegistry";

// ──────────────────────────────────────────────────────────────────────────────
// Role meta
// ──────────────────────────────────────────────────────────────────────────────

type RoleOption = {
  id: UserRole | "chief_doctor";
  label: string;
  sublabel: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bg: string;
};

const ROLES: RoleOption[] = [
  {
    id: "chief_doctor",
    label: "Chief Doctor",
    sublabel: "Register your hospital & manage wards",
    icon: "medical-services",
    color: "#087E7B",
    bg: "#E6F5F3",
  },
  {
    id: "doctor",
    label: "Doctor",
    sublabel: "View patient queue & consultations",
    icon: "local-hospital",
    color: "#2369A5",
    bg: "#EAF4FF",
  },
  {
    id: "asha_worker",
    label: "ASHA Worker",
    sublabel: "Register patients & manage medicines",
    icon: "volunteer-activism",
    color: "#B66A00",
    bg: "#FFF4E5",
  },
  {
    id: "receptionist",
    label: "Receptionist",
    sublabel: "Register patients & manage arrivals",
    icon: "person-pin",
    color: "#6B3FA0",
    bg: "#F3EEFF",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useUserAuth();

  const [activeRole, setActiveRole] = useState<UserRole>("chief_doctor");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [hospitals, setHospitals] = useState<HospitalRecord[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sign in form ──
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPasscode, setSignInPasscode] = useState("");
  const [signInRole, setSignInRole] = useState<UserRole>("chief_doctor");

  // ── Sign up form ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  // Chief doctor only
  const [hospitalName, setHospitalName] = useState("");
  // Staff fields (store as string to match facilityId type)
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");

  const refreshHospitals = useCallback(async () => {
    setHospitalsLoading(true);
    try {
      const list = await getHospitals();
      setHospitals(list);
      if (list.length > 0) {
        // Convert hospital ID to string for consistency with facilityId
        const firstId = String(list[0].id);
        setSelectedHospitalId((prev) => (prev && list.some((h) => String(h.id) === prev)) ? prev : firstId);
      }
    } catch {
      setHospitals([]);
    } finally {
      setHospitalsLoading(false);
    }
  }, []);

  // ── Hospital Dropdown State ──
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [chiefHospitalMode, setChiefHospitalMode] = useState<"new" | "existing">("new");

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(hospitalSearch.toLowerCase().trim()),
  );

  const selectedHospital = hospitals.find((h) => String(h.id) === selectedHospitalId) || hospitals[0];

  const resetForm = () => {
    setName("");
    setPhone("");
    setPasscode("");
    setHospitalName("");
    setError(null);
    setShowHospitalDropdown(false);
    setHospitalSearch("");
  };

  const handleSignIn = async () => {
    if (!signInIdentifier.trim()) {
      setError("Please enter your phone number, name, or staff ID");
      return;
    }
    if (!signInPasscode.trim()) {
      setError("Please enter your passcode");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(signInIdentifier.trim(), signInPasscode.trim(), signInRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!passcode.trim() || passcode.trim().length < 4) {
      setError("Passcode must be at least 4 characters");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (activeRole === "chief_doctor") {
        let finalFacilityName = hospitalName.trim();
        let finalFacilityId: string;

        if (chiefHospitalMode === "new") {
          if (!finalFacilityName) {
            setError("Hospital name is required");
            setLoading(false);
            return;
          }
          const createdHosp = await registerHospital(finalFacilityName);
          finalFacilityName = createdHosp.name;
          finalFacilityId = String(createdHosp.id);
        } else {
          if (!selectedHospital) {
            setError("Please select a hospital from the dropdown");
            setLoading(false);
            return;
          }
          finalFacilityName = selectedHospital.name;
          finalFacilityId = String(selectedHospital.id);
        }

        // Sign up chief doctor
        await signUp({
          name: name.trim(),
          role: "chief_doctor",
          phone: phone.trim() || undefined,
          passcode: passcode.trim(),
          facilityName: finalFacilityName,
          facilityId: finalFacilityId,
        });
        await refreshHospitals();
      } else {
        // Staff doctor / asha / receptionist
        const targetHospital = hospitals.find((h) => String(h.id) === selectedHospitalId) || hospitals[0];
        if (!targetHospital) {
          setError("Please select your hospital from the dropdown");
          setLoading(false);
          return;
        }
        await signUp({
          name: name.trim(),
          role: activeRole,
          phone: phone.trim() || undefined,
          passcode: passcode.trim(),
          facilityName: targetHospital.name,
          facilityId: String(targetHospital.id),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const currentRoleMeta = ROLES.find((r) => r.id === activeRole) ?? ROLES[0];
  const isStaff = activeRole !== "chief_doctor";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Rural Health Access</Text>
          <Text style={styles.brandSub}>Healthcare Management Platform</Text>
        </View>

        {/* Role Picker */}
        <Text style={styles.sectionLabel}>SELECT YOUR ROLE</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((role) => {
            const active = activeRole === role.id;
            return (
              <Pressable
                key={role.id}
                onPress={() => {
                  setActiveRole(role.id as UserRole);
                  setSignInRole(role.id as UserRole);
                  setError(null);
                  resetForm();
                  void refreshHospitals();
                }}
                style={[styles.roleCard, active && { borderColor: role.color, borderWidth: 2, backgroundColor: role.bg }]}
              >
                <View style={[styles.roleIconBadge, active && { backgroundColor: role.color }]}>
                  <MaterialIcons name={role.icon} size={22} color={active ? "#fff" : "#6C817C"} />
                </View>
                <Text style={[styles.roleCardTitle, active && { color: role.color }]}>{role.label}</Text>
                <Text style={styles.roleCardSub}>{role.sublabel}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          {(["signin", "signup"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
                void refreshHospitals();
              }}
              style={[styles.modeTab, mode === m && { backgroundColor: currentRoleMeta.color }]}
            >
              <MaterialIcons
                name={m === "signin" ? "login" : "person-add"}
                size={16}
                color={mode === m ? "#fff" : "#6C817C"}
              />
              <Text style={[styles.modeTabText, mode === m && { color: "#fff", fontWeight: "900" }]}>
                {m === "signin" ? "Sign In" : "Register"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={18} color="#B42318" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ─── SIGN IN ─── */}
        {mode === "signin" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In as {currentRoleMeta.label}</Text>

            {/* Hospital Dropdown */}
            <Text style={styles.inputLabel}>Select Hospital Facility</Text>
            <View style={styles.dropdownContainer}>
              <Pressable
                onPress={() => setShowHospitalDropdown(!showHospitalDropdown)}
                style={[styles.dropdownTrigger, showHospitalDropdown && styles.dropdownTriggerActive]}
              >
                <View style={styles.dropdownIconCircle}>
                  <MaterialIcons name="local-hospital" size={18} color="#087E7B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownSelectedName} numberOfLines={1}>
                    {selectedHospital?.name || "Select Hospital Facility"}
                  </Text>
                </View>
                <MaterialIcons
                  name={showHospitalDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={22}
                  color="#087E7B"
                />
              </Pressable>

              {showHospitalDropdown && (
                <View style={styles.dropdownMenu}>
                  <View style={styles.dropdownSearchRow}>
                    <MaterialIcons name="search" size={18} color="#6C817C" />
                    <TextInput
                      value={hospitalSearch}
                      onChangeText={setHospitalSearch}
                      placeholder="Search hospitals..."
                      placeholderTextColor="#8CA19B"
                      style={styles.dropdownSearchInput}
                    />
                    {hospitalSearch ? (
                      <Pressable onPress={() => setHospitalSearch("")}>
                        <MaterialIcons name="close" size={16} color="#6C817C" />
                      </Pressable>
                    ) : null}
                  </View>

                  <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {filteredHospitals.map((h) => {
                      const isSelected = selectedHospitalId === String(h.id) || (!selectedHospitalId && String(hospitals[0]?.id) === String(h.id));
                      return (
                        <Pressable
                          key={h.id}
                          onPress={() => {
                            setSelectedHospitalId(String(h.id));
                            setShowHospitalDropdown(false);
                            setHospitalSearch("");
                          }}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                        >
                          <MaterialIcons
                            name="local-hospital"
                            size={16}
                            color={isSelected ? "#087E7B" : "#6C817C"}
                          />
                          <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                            {h.name}
                          </Text>
                          {isSelected && (
                            <MaterialIcons name="check" size={18} color="#087E7B" />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={styles.inputLabel}>Name, Phone, or ID</Text>
            <TextInput
              value={signInIdentifier}
              onChangeText={setSignInIdentifier}
              placeholder="e.g. 9876543210 or your staff ID"
              placeholderTextColor="#8CA19B"
              style={styles.input}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Passcode / PIN</Text>
            <TextInput
              value={signInPasscode}
              onChangeText={setSignInPasscode}
              placeholder="Enter your PIN"
              placeholderTextColor="#8CA19B"
              secureTextEntry
              keyboardType="number-pad"
              style={styles.input}
            />

            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: currentRoleMeta.color, opacity: pressed || loading ? 0.75 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="login" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* ─── SIGN UP ─── */}
        {mode === "signup" && (
          <View style={styles.card}>
            <View style={[styles.rolePill, { backgroundColor: currentRoleMeta.bg }]}>
              <MaterialIcons name={currentRoleMeta.icon} size={18} color={currentRoleMeta.color} />
              <Text style={[styles.rolePillText, { color: currentRoleMeta.color }]}>
                Registering as {currentRoleMeta.label}
              </Text>
            </View>

            {/* ── Chief Doctor: create hospital OR choose existing ── */}
            {activeRole === "chief_doctor" && (
              <>
                <Text style={styles.cardSectionTitle}>🏥 Hospital Setup</Text>
                <View style={styles.modeTabs}>
                  <Pressable
                    onPress={() => setChiefHospitalMode("new")}
                    style={[styles.smallTab, chiefHospitalMode === "new" && styles.smallTabActive]}
                  >
                    <Text style={[styles.smallTabText, chiefHospitalMode === "new" && styles.smallTabTextActive]}>
                      Register New Hospital
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setChiefHospitalMode("existing")}
                    style={[styles.smallTab, chiefHospitalMode === "existing" && styles.smallTabActive]}
                  >
                    <Text style={[styles.smallTabText, chiefHospitalMode === "existing" && styles.smallTabTextActive]}>
                      Select Existing ({hospitals.length})
                    </Text>
                  </Pressable>
                </View>

                {chiefHospitalMode === "new" ? (
                  <>
                    <Text style={styles.inputLabel}>New Hospital Name</Text>
                    <TextInput
                      value={hospitalName}
                      onChangeText={setHospitalName}
                      placeholder="e.g. City General Hospital"
                      placeholderTextColor="#8CA19B"
                      style={styles.input}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Select Hospital from Database</Text>
                    <View style={styles.dropdownContainer}>
                      <Pressable
                        onPress={() => setShowHospitalDropdown(!showHospitalDropdown)}
                        style={[styles.dropdownTrigger, showHospitalDropdown && styles.dropdownTriggerActive]}
                      >
                        <View style={styles.dropdownIconCircle}>
                          <MaterialIcons name="local-hospital" size={18} color="#087E7B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownSelectedName} numberOfLines={1}>
                            {selectedHospital?.name || "Select Hospital Facility"}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={showHospitalDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                          size={22}
                          color="#087E7B"
                        />
                      </Pressable>

                      {showHospitalDropdown && (
                        <View style={styles.dropdownMenu}>
                          <View style={styles.dropdownSearchRow}>
                            <MaterialIcons name="search" size={18} color="#6C817C" />
                            <TextInput
                              value={hospitalSearch}
                              onChangeText={setHospitalSearch}
                              placeholder="Search hospitals..."
                              placeholderTextColor="#8CA19B"
                              style={styles.dropdownSearchInput}
                            />
                          </View>

                          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                            {filteredHospitals.map((h) => {
                              const isSelected = selectedHospitalId === String(h.id);
                              return (
                                <Pressable
                                  key={h.id}
                                  onPress={() => {
                                    setSelectedHospitalId(String(h.id));
                                    setShowHospitalDropdown(false);
                                  }}
                                  style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                                >
                                  <MaterialIcons
                                    name="local-hospital"
                                    size={16}
                                    color={isSelected ? "#087E7B" : "#6C817C"}
                                  />
                                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                                    {h.name}
                                  </Text>
                                  {isSelected && (
                                    <MaterialIcons name="check" size={18} color="#087E7B" />
                                  )}
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </>
                )}

                <View style={styles.infoBox}>
                  <MaterialIcons name="info-outline" size={16} color="#2369A5" />
                  <Text style={styles.infoText}>
                    Chief Doctors can manage wards, beds, and oversee consultations for this facility.
                  </Text>
                </View>
              </>
            )}

            {/* ── Staff: Dropdown Picker for Hospital ── */}
            {isStaff && (
              <>
                <Text style={styles.cardSectionTitle}>🏥 Select Hospital Facility ({hospitals.length} Available)</Text>
                <Text style={styles.inputLabel}>Hospital / PHC / CHC Dropdown</Text>
                <View style={styles.dropdownContainer}>
                  <Pressable
                    onPress={() => setShowHospitalDropdown(!showHospitalDropdown)}
                    style={[styles.dropdownTrigger, showHospitalDropdown && styles.dropdownTriggerActive]}
                  >
                    <View style={styles.dropdownIconCircle}>
                      <MaterialIcons name="local-hospital" size={18} color="#087E7B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownSelectedName} numberOfLines={1}>
                        {selectedHospital?.name || "Select Hospital Facility"}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showHospitalDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={22}
                      color="#087E7B"
                    />
                  </Pressable>

                  {showHospitalDropdown && (
                    <View style={styles.dropdownMenu}>
                      <View style={styles.dropdownSearchRow}>
                        <MaterialIcons name="search" size={18} color="#6C817C" />
                        <TextInput
                          value={hospitalSearch}
                          onChangeText={setHospitalSearch}
                          placeholder="Search hospital name..."
                          placeholderTextColor="#8CA19B"
                          style={styles.dropdownSearchInput}
                        />
                        {hospitalSearch ? (
                          <Pressable onPress={() => setHospitalSearch("")}>
                            <MaterialIcons name="close" size={16} color="#6C817C" />
                          </Pressable>
                        ) : null}
                      </View>

                      <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                        {filteredHospitals.map((h) => {
                          const isSelected = selectedHospitalId === String(h.id) || (!selectedHospitalId && String(hospitals[0]?.id) === String(h.id));
                          return (
                            <Pressable
                              key={h.id}
                              onPress={() => {
                                setSelectedHospitalId(String(h.id));
                                setShowHospitalDropdown(false);
                                setHospitalSearch("");
                              }}
                              style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                            >
                              <MaterialIcons
                                name="local-hospital"
                                size={16}
                                color={isSelected ? "#087E7B" : "#6C817C"}
                              />
                              <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                                {h.name}
                              </Text>
                              {isSelected && (
                                <MaterialIcons name="check" size={18} color="#087E7B" />
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* ── Common fields ── */}
            <Text style={styles.cardSectionTitle}>Your Details</Text>
            <Text style={styles.inputLabel}>
              {activeRole === "chief_doctor" || activeRole === "doctor" ? "Full Name (e.g. Dr. Priya)" : "Full Name"}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#8CA19B"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor="#8CA19B"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Set PIN / Passcode</Text>
            <TextInput
              value={passcode}
              onChangeText={setPasscode}
              placeholder="Min 4 digits"
              placeholderTextColor="#8CA19B"
              secureTextEntry
              keyboardType="number-pad"
              style={styles.input}
            />

            <Pressable
              onPress={handleSignUp}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: currentRoleMeta.color, opacity: pressed || loading ? 0.75 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="person-add" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {activeRole === "chief_doctor" ? "Register & Sign In" : "Register & Sign In"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F5" },
  scroll: { paddingHorizontal: 18, gap: 16 },
  brandHeader: { alignItems: "center", marginBottom: 4, gap: 6 },
  brandLogoImage: { width: 90, height: 90, marginBottom: 2 },
  logoBadge: {
    width: 68, height: 68, borderRadius: 20, backgroundColor: "#E6F5F3",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#087E7B", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  brandTitle: { color: "#18332F", fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  brandSub: { color: "#6C817C", fontSize: 13, fontWeight: "600", textAlign: "center" },
  sectionLabel: { color: "#6C817C", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roleCard: {
    flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E0EBE7", padding: 12, gap: 6,
    alignItems: "flex-start",
  },
  roleIconBadge: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0F4F2",
    alignItems: "center", justifyContent: "center",
  },
  roleCardTitle: { color: "#18332F", fontSize: 14, fontWeight: "800" },
  roleCardSub: { color: "#6C817C", fontSize: 11, fontWeight: "600", lineHeight: 15 },
  modeTabs: { flexDirection: "row", gap: 8 },
  modeTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E0EBE7",
  },
  modeTabText: { color: "#6C817C", fontSize: 14, fontWeight: "700" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FDECEC", borderRadius: 12, padding: 12,
  },
  errorText: { color: "#B42318", fontSize: 13, fontWeight: "700", flex: 1, lineHeight: 18 },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18, gap: 4,
    shadowColor: "#18332F", shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  cardTitle: { color: "#18332F", fontSize: 19, fontWeight: "900", marginBottom: 10 },
  cardSectionTitle: { color: "#18332F", fontSize: 14, fontWeight: "900", marginTop: 10, marginBottom: 2 },
  inputLabel: { color: "#4A6560", fontSize: 12, fontWeight: "800", marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: "#F7FAF9", borderColor: "#D5E1DD", borderRadius: 12, borderWidth: 1,
    color: "#18332F", fontSize: 15, minHeight: 48, paddingHorizontal: 14,
  },
  primaryBtn: {
    alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 8,
    justifyContent: "center", minHeight: 50, marginTop: 14, paddingHorizontal: 18,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    marginBottom: 4,
  },
  rolePillText: { fontSize: 13, fontWeight: "800" },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#EAF4FF", borderRadius: 12, padding: 12, marginTop: 4,
  },
  infoText: { color: "#2369A5", fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 17 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFF4E5", borderRadius: 12, padding: 14, marginVertical: 6,
  },
  warningText: { color: "#9A5B00", fontSize: 13, fontWeight: "700", flex: 1, lineHeight: 19 },
  facilityBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#E6F5F3", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#B2DFDB", marginBottom: 10,
  },
  facilityBannerLabel: { color: "#087E7B", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  facilityBannerName: { color: "#18332F", fontSize: 14, fontWeight: "800", marginTop: 2 },
  dropdownContainer: { marginBottom: 10, position: "relative", zIndex: 10 },
  dropdownTrigger: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#D5E1DD", paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownTriggerActive: {
    borderColor: "#087E7B", backgroundColor: "#F7FCFB",
  },
  dropdownIconCircle: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#E6F5F3", alignItems: "center", justifyContent: "center",
  },
  dropdownSelectedName: {
    color: "#18332F", fontSize: 15, fontWeight: "800",
  },
  dropdownMenu: {
    backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#087E7B", marginTop: 6, padding: 8,
    shadowColor: "#087E7B", shadowOpacity: 0.12, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  dropdownSearchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F7FAF9", borderRadius: 10, borderWidth: 1,
    borderColor: "#D5E1DD", paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 8,
  },
  dropdownSearchInput: {
    flex: 1, color: "#18332F", fontSize: 14, paddingVertical: 4,
  },
  dropdownList: { maxHeight: 180 },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  dropdownItemSelected: {
    backgroundColor: "#E6F5F3",
  },
  dropdownItemText: {
    color: "#4A6560", fontSize: 14, fontWeight: "600", flex: 1,
  },
  dropdownItemTextSelected: {
    color: "#087E7B", fontWeight: "900",
  },
  smallTab: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10,
    backgroundColor: "#F7FAF9", borderWidth: 1, borderColor: "#D5E1DD",
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  smallTabActive: {
    backgroundColor: "#087E7B", borderColor: "#087E7B",
  },
  smallTabText: { color: "#4A6560", fontSize: 12, fontWeight: "700" },
  smallTabTextActive: { color: "#FFFFFF", fontWeight: "800" },
  inlineRoles: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  inlineRoleBtn: {
    borderRadius: 8, borderWidth: 1.5, borderColor: "#D5E1DD",
    paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#F7FAF9",
  },
  inlineRoleBtnText: { color: "#4A6560", fontSize: 12, fontWeight: "700" },
});
