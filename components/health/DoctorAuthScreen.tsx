import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDoctorAuth } from "@/lib/health/DoctorAuthContext";
import { type DoctorProfile, type DoctorSpecialization, PRESET_DEFAULT_PIN } from "@/lib/health/doctorAuth";
import { useRef } from "react";

const SPECIALIZATIONS: DoctorSpecialization[] = [
  "General Medicine (MBBS)",
  "Pediatrics / Child Health",
  "Obstetrics & Gynecology",
  "Emergency & Trauma Care",
  "Community Medicine / MO",
  "General Surgery",
  "Dental & Oral Health",
];

export function DoctorAuthScreen() {
  const { signIn, signUp, registeredDoctors } = useDoctorAuth();
  const passwordInputRef = useRef<import("react-native").TextInput>(null);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Sign In form state
  const [loginId, setLoginId] = useState("");
  const [passcode, setPasscode] = useState("");

  // Sign Up / Create Profile form state
  const [fullName, setFullName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [specialization, setSpecialization] = useState<DoctorSpecialization>("General Medicine (MBBS)");
  const [facilityName, setFacilityName] = useState("Nandipur Primary Health Centre");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [signupPasscode, setSignupPasscode] = useState("");

  const handleSignIn = async () => {
    if (!loginId.trim()) {
      setError("Please enter your Doctor ID, MCI Reg No., or Email.");
      return;
    }
    if (!passcode.trim()) {
      setError("Please enter your password or PIN.");
      passwordInputRef.current?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signIn(loginId.trim(), passcode.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      setError("Please enter the doctor's full name.");
      return;
    }
    if (!doctorId.trim()) {
      setError("Please enter a Medical Registration No. or Staff ID.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signUp({
        name: fullName.trim(),
        doctorId: doctorId.trim(),
        specialization,
        facilityName: facilityName.trim() || "Nandipur Primary Health Centre",
        facilityId: 1,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        passcode: signupPasscode.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile creation failed.");
    } finally {
      setBusy(false);
    }
  };

  // Preset card tapped → pre-fill the ID and move focus to password
  const handleQuickSelect = (preset: DoctorProfile) => {
    setLoginId(preset.doctorId);
    setPasscode("");
    setError(null);
    // Small delay so state updates before focusing
    setTimeout(() => passwordInputRef.current?.focus(), 50);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Top Clinical Header */}
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="local-hospital" size={28} color="#087E7B" />
            </View>
            <View style={styles.lockBadge}>
              <MaterialIcons name="lock" size={13} color="#9A5B00" />
              <Text style={styles.lockBadgeText}>Restricted Clinical Access</Text>
            </View>
          </View>

          <Text style={styles.facilitySubtitle}>Nandipur Primary Health Centre</Text>
          <Text style={styles.portalTitle}>Doctor & Staff Portal</Text>
          <Text style={styles.portalDescription}>
            Medical records, patient queues, pharmacy stocks, and referrals are confidential. Please sign in or create your doctor profile to proceed.
          </Text>
        </View>

        {/* Tab Switcher: Sign In vs Create Doctor Profile */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => {
              setTab("signin");
              setError(null);
            }}
            style={[styles.tabButton, tab === "signin" && styles.tabButtonActive]}
          >
            <MaterialIcons
              name="login"
              size={18}
              color={tab === "signin" ? "#087E7B" : "#6C817C"}
            />
            <Text style={[styles.tabButtonText, tab === "signin" && styles.tabButtonTextActive]}>
              Doctor Sign In
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setTab("signup");
              setError(null);
            }}
            style={[styles.tabButton, tab === "signup" && styles.tabButtonActive]}
          >
            <MaterialIcons
              name="person-add"
              size={18}
              color={tab === "signup" ? "#087E7B" : "#6C817C"}
            />
            <Text style={[styles.tabButtonText, tab === "signup" && styles.tabButtonTextActive]}>
              Create Profile
            </Text>
          </Pressable>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#B42318" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* SIGN IN VIEW */}
        {tab === "signin" ? (
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>Authorized Clinician Sign In</Text>

            <Text style={styles.inputLabel}>Doctor ID / MCI Reg No / Email</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="badge" size={20} color="#54716B" style={styles.inputIcon} />
              <TextInput
                value={loginId}
                onChangeText={setLoginId}
                placeholder="e.g. MCI-48201 or dr.asha@phc.in"
                placeholderTextColor="#8CA19B"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>

            <Text style={styles.inputLabel}>Security PIN / Password</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock-outline" size={20} color="#54716B" style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                value={passcode}
                onChangeText={setPasscode}
                placeholder="Enter your password or PIN"
                placeholderTextColor="#8CA19B"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSignIn}
                returnKeyType="go"
                style={styles.textInput}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                style={styles.eyeButton}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={22}
                  color="#54716B"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSignIn}
              disabled={busy}
              style={({ pressed }) => [styles.primaryAction, { opacity: busy || pressed ? 0.75 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryActionText}>Sign In as Doctor</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Quick Demo Presets */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or select a staff profile</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.presetHint}>
              <MaterialIcons name="info-outline" size={14} color="#087E7B" />
              <Text style={styles.presetHintText}>
                Demo PIN for all preset doctors: <Text style={styles.presetHintPin}>{PRESET_DEFAULT_PIN}</Text>
              </Text>
            </View>

            <View style={styles.presetList}>
              {registeredDoctors.slice(0, 3).map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => handleQuickSelect(doc)}
                  disabled={busy}
                  style={({ pressed }) => [styles.presetCard, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={styles.presetAvatar}>
                    <Text style={styles.presetAvatarText}>
                      {doc.name.replace("Dr. ", "").charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.presetInfo}>
                    <Text style={styles.presetName}>{doc.name}</Text>
                    <Text style={styles.presetSub}>{doc.specialization} · {doc.doctorId}</Text>
                  </View>
                  <MaterialIcons name="keyboard-tab" size={18} color="#087E7B" />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setTab("signup")} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>
                New doctor at this facility? <Text style={styles.switchLinkBold}>Create Profile</Text>
              </Text>
            </Pressable>
          </View>
        ) : (
          /* CREATE DOCTOR PROFILE VIEW */
          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>New Doctor Profile Registration</Text>
            <Text style={styles.cardSubtitle}>
              Register your clinician credentials to manage queues, admit patients, and write clinical notes.
            </Text>

            <Text style={styles.inputLabel}>Doctor Full Name *</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={20} color="#54716B" style={styles.inputIcon} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Dr. Sunita Patel"
                placeholderTextColor="#8CA19B"
                style={styles.textInput}
              />
            </View>

            <Text style={styles.inputLabel}>Medical Registration / MCI No. / Staff ID *</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="verified" size={20} color="#54716B" style={styles.inputIcon} />
              <TextInput
                value={doctorId}
                onChangeText={setDoctorId}
                placeholder="e.g. MCI-89210 or DOC-501"
                placeholderTextColor="#8CA19B"
                autoCapitalize="characters"
                style={styles.textInput}
              />
            </View>

            <Text style={styles.inputLabel}>Primary Specialization / Role *</Text>
            <View style={styles.chipGrid}>
              {SPECIALIZATIONS.map((spec) => {
                const isSelected = specialization === spec;
                return (
                  <Pressable
                    key={spec}
                    onPress={() => setSpecialization(spec)}
                    style={[styles.specChip, isSelected && styles.specChipActive]}
                  >
                    <MaterialIcons
                      name={isSelected ? "check-circle" : "radio-button-unchecked"}
                      size={16}
                      color={isSelected ? "#087E7B" : "#8CA19B"}
                    />
                    <Text style={[styles.specChipText, isSelected && styles.specChipTextActive]}>
                      {spec}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Primary Health Centre / Facility</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="apartment" size={20} color="#54716B" style={styles.inputIcon} />
              <TextInput
                value={facilityName}
                onChangeText={setFacilityName}
                placeholder="e.g. Nandipur Primary Health Centre"
                placeholderTextColor="#8CA19B"
                style={styles.textInput}
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="phone" size={18} color="#54716B" style={styles.inputIcon} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="98765 00000"
                    placeholderTextColor="#8CA19B"
                    keyboardType="phone-pad"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={18} color="#54716B" style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="doc@phc.in"
                    placeholderTextColor="#8CA19B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.textInput}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.inputLabel}>Security PIN / Password (Optional)</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock-outline" size={20} color="#54716B" style={styles.inputIcon} />
              <TextInput
                value={signupPasscode}
                onChangeText={setSignupPasscode}
                placeholder="Create a password or 4-digit PIN"
                placeholderTextColor="#8CA19B"
                secureTextEntry={!showSignupPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
              <Pressable
                onPress={() => setShowSignupPassword((v) => !v)}
                hitSlop={8}
                style={styles.eyeButton}
                accessibilityLabel={showSignupPassword ? "Hide password" : "Show password"}
              >
                <MaterialIcons
                  name={showSignupPassword ? "visibility-off" : "visibility"}
                  size={22}
                  color="#54716B"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSignUp}
              disabled={busy}
              style={({ pressed }) => [styles.primaryAction, { opacity: busy || pressed ? 0.75 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryActionText}>Create Profile & Enter Clinic</Text>
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <Pressable onPress={() => setTab("signin")} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>
                Already registered? <Text style={styles.switchLinkBold}>Sign In here</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {/* Security & Compliance Footer */}
        <View style={styles.footerNote}>
          <MaterialIcons name="shield" size={18} color="#087E7B" />
          <Text style={styles.footerText}>
            Protected Health Information (PHI) encrypted locally and synchronised securely with offline-first protocols. Compliant with Ayushman Bharat Digital Mission (ABDM) guidelines.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E6F5F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#087E7B",
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF4E5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  lockBadgeText: {
    color: "#9A5B00",
    fontSize: 12,
    fontWeight: "800",
  },
  facilitySubtitle: {
    color: "#087E7B",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  portalTitle: {
    color: "#18332F",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  portalDescription: {
    color: "#54716B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 480,
    marginTop: 8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E4EDE9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#18332F",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tabButtonText: {
    color: "#6C817C",
    fontSize: 14,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#087E7B",
    fontWeight: "900",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FDECEC",
    borderColor: "#F8D7DA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#18332F",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E6EEEA",
  },
  cardEyebrow: {
    color: "#087E7B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#6C817C",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    color: "#18332F",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBF9",
    borderWidth: 1.2,
    borderColor: "#D5E1DD",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  eyeButton: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 8,
  },
  textInput: {
    flex: 1,
    color: "#18332F",
    fontSize: 15,
    paddingVertical: 10,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginVertical: 4,
  },
  specChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F2F6F4",
    borderWidth: 1,
    borderColor: "#D5E1DD",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  specChipActive: {
    backgroundColor: "#E6F5F3",
    borderColor: "#087E7B",
  },
  specChipText: {
    color: "#54716B",
    fontSize: 12,
    fontWeight: "700",
  },
  specChipTextActive: {
    color: "#087E7B",
    fontWeight: "900",
  },
  rowTwo: {
    flexDirection: "row",
    gap: 12,
  },
  primaryAction: {
    backgroundColor: "#087E7B",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    marginTop: 22,
    paddingHorizontal: 20,
    shadowColor: "#087E7B",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4EDE9",
  },
  dividerText: {
    color: "#8CA19B",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  presetHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E6F5F3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#C0E4E2",
  },
  presetHintText: {
    color: "#087E7B",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  presetHintPin: {
    fontWeight: "900",
    letterSpacing: 1,
    color: "#065A57",
  },
  presetList: {
    gap: 8,
  },
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F7FAF9",
    borderWidth: 1,
    borderColor: "#E1EBE7",
    borderRadius: 12,
    padding: 10,
  },
  presetAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#087E7B",
    alignItems: "center",
    justifyContent: "center",
  },
  presetAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    color: "#18332F",
    fontSize: 13,
    fontWeight: "900",
  },
  presetSub: {
    color: "#6C817C",
    fontSize: 11,
    marginTop: 1,
  },
  switchLink: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 6,
  },
  switchLinkText: {
    color: "#54716B",
    fontSize: 13,
  },
  switchLinkBold: {
    color: "#087E7B",
    fontWeight: "900",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  footerText: {
    color: "#6C817C",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
