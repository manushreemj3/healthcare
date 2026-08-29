import AsyncStorage from "@react-native-async-storage/async-storage";

export type DoctorSpecialization =
  | "General Medicine (MBBS)"
  | "Pediatrics / Child Health"
  | "Obstetrics & Gynecology"
  | "Emergency & Trauma Care"
  | "Community Medicine / MO"
  | "General Surgery"
  | "Dental & Oral Health";

export type DoctorProfile = {
  id: string;
  name: string;
  doctorId: string; // e.g. "MCI-78492" or "DOC-102"
  specialization: DoctorSpecialization | string;
  facilityName: string;
  facilityId: number;
  phone?: string;
  email?: string;
  role: "doctor" | "specialist" | "medical_officer";
  passcodeHash?: string; // simple hash of the PIN/password
  createdAt: number;
  lastLoginAt: number;
};

export type CreateDoctorInput = {
  name: string;
  doctorId: string;
  specialization: DoctorSpecialization | string;
  facilityName: string;
  facilityId?: number;
  phone?: string;
  email?: string;
  passcode?: string;
};

const DOCTOR_PROFILE_KEY = "rural-health-access.doctor-profile.v1";
const DOCTOR_REGISTRY_KEY = "rural-health-access.doctor-registry.v1";
const PORTAL_TOKEN_KEY = "rural-health-access.portal-token";

/** Default PIN for all preset / demo doctors. Shown as hint on the login screen. */
export const PRESET_DEFAULT_PIN = "1234";

function simpleHash(s: string): string {
  // A lightweight deterministic hash (not cryptographic, sufficient for local-only PIN)
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function hashPasscode(passcode: string): string {
  return simpleHash(passcode.trim());
}

export function verifyPasscode(entered: string, storedHash: string): boolean {
  return simpleHash(entered.trim()) === storedHash;
}

const PRESET_PIN_HASH = hashPasscode(PRESET_DEFAULT_PIN);

export const PRESET_DOCTORS: DoctorProfile[] = [
  {
    id: "doc-101",
    name: "Dr. Asha Verma",
    doctorId: "MCI-48201",
    specialization: "Community Medicine / MO",
    facilityName: "Nandipur Primary Health Centre",
    facilityId: 1,
    phone: "98765 43210",
    email: "dr.asha@phc.in",
    role: "medical_officer",
    passcodeHash: PRESET_PIN_HASH,
    createdAt: Date.now() - 86400000 * 30,
    lastLoginAt: Date.now(),
  },
  {
    id: "doc-102",
    name: "Dr. Rajesh Gupta",
    doctorId: "MCI-29184",
    specialization: "Pediatrics / Child Health",
    facilityName: "Nandipur Primary Health Centre",
    facilityId: 1,
    phone: "98765 11223",
    email: "dr.rajesh@phc.in",
    role: "specialist",
    passcodeHash: PRESET_PIN_HASH,
    createdAt: Date.now() - 86400000 * 15,
    lastLoginAt: Date.now(),
  },
  {
    id: "doc-103",
    name: "Dr. Meenakshi Iyer",
    doctorId: "MCI-67092",
    specialization: "Obstetrics & Gynecology",
    facilityName: "Nandipur Primary Health Centre",
    facilityId: 1,
    phone: "98765 88990",
    email: "dr.meenakshi@phc.in",
    role: "specialist",
    passcodeHash: PRESET_PIN_HASH,
    createdAt: Date.now() - 86400000 * 10,
    lastLoginAt: Date.now(),
  },
];

function safeBase64Encode(str: string): string {
  if (typeof btoa === "function") return btoa(str);
  if (typeof Buffer !== "undefined") return Buffer.from(str).toString("base64");
  return "";
}

function syncPortalToken(token: string) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
    }
  } catch {
    /* noop */
  }
}

function removePortalToken() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(PORTAL_TOKEN_KEY);
    }
  } catch {
    /* noop */
  }
}

export async function getStoredDoctorProfile(): Promise<DoctorProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(DOCTOR_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DoctorProfile;
  } catch {
    return null;
  }
}

export async function getRegisteredDoctors(): Promise<DoctorProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(DOCTOR_REGISTRY_KEY);
    if (!raw) return PRESET_DOCTORS;
    const parsed = JSON.parse(raw) as DoctorProfile[];
    const existingIds = new Set(parsed.map((d) => d.doctorId.toLowerCase()));
    const merged = [...parsed];
    for (const preset of PRESET_DOCTORS) {
      if (!existingIds.has(preset.doctorId.toLowerCase())) {
        merged.push(preset);
      }
    }
    return merged;
  } catch {
    return PRESET_DOCTORS;
  }
}

export async function saveRegisteredDoctor(profile: DoctorProfile): Promise<void> {
  try {
    const all = await getRegisteredDoctors();
    const updated = [profile, ...all.filter((d) => d.doctorId.toLowerCase() !== profile.doctorId.toLowerCase())];
    await AsyncStorage.setItem(DOCTOR_REGISTRY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save registered doctor:", error);
  }
}

export async function storeDoctorSession(profile: DoctorProfile): Promise<void> {
  try {
    const updatedProfile = { ...profile, lastLoginAt: Date.now() };
    await AsyncStorage.setItem(DOCTOR_PROFILE_KEY, JSON.stringify(updatedProfile));
    await saveRegisteredDoctor(updatedProfile);

    // Sync token with portal auth
    const syntheticToken = safeBase64Encode(
      JSON.stringify({
        openId: profile.doctorId,
        name: profile.name,
        role: profile.role,
        facilityId: profile.facilityId,
        facilityName: profile.facilityName,
        specialization: profile.specialization,
      }),
    );
    syncPortalToken(`eyJhbGciOiJIUzI1NiJ9.${syntheticToken}.doctor_session`);
  } catch (error) {
    console.error("Failed to store doctor session:", error);
  }
}

export async function clearDoctorSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DOCTOR_PROFILE_KEY);
    removePortalToken();
  } catch (error) {
    console.error("Failed to clear doctor session:", error);
  }
}

export async function createDoctorProfile(input: CreateDoctorInput): Promise<DoctorProfile> {
  const formattedName = input.name.trim().startsWith("Dr.")
    ? input.name.trim()
    : `Dr. ${input.name.trim()}`;

  const profile: DoctorProfile = {
    id: `doc-${Date.now().toString(36)}`,
    name: formattedName,
    doctorId: input.doctorId.trim(),
    specialization: input.specialization || "General Medicine (MBBS)",
    facilityName: input.facilityName.trim() || "Nandipur Primary Health Centre",
    facilityId: input.facilityId ?? 1,
    phone: input.phone?.trim(),
    email: input.email?.trim(),
    role: "doctor",
    // Store hashed passcode; fall back to default preset PIN if none provided
    passcodeHash: input.passcode?.trim()
      ? hashPasscode(input.passcode.trim())
      : hashPasscode(PRESET_DEFAULT_PIN),
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  await storeDoctorSession(profile);
  return profile;
}

/**
 * Finds a registered doctor by ID / email and verifies their passcode.
 * Throws a descriptive error if the doctor is not found or the passcode is wrong.
 */
export async function authenticateDoctor(
  doctorIdOrEmail: string,
  passcode: string,
): Promise<DoctorProfile> {
  const query = doctorIdOrEmail.trim().toLowerCase();
  const all = await getRegisteredDoctors();

  const found = all.find(
    (d) =>
      d.doctorId.toLowerCase() === query ||
      d.email?.toLowerCase() === query ||
      d.name.toLowerCase() === query,
  );

  if (!found) {
    throw new Error(
      "No doctor found with that ID / email. Please check your credentials or create a new profile.",
    );
  }

  // Verify passcode
  if (found.passcodeHash) {
    if (!passcode?.trim()) {
      throw new Error("Please enter your password or PIN to sign in.");
    }
    if (!verifyPasscode(passcode, found.passcodeHash)) {
      throw new Error("Incorrect password or PIN. Please try again.");
    }
  }

  await storeDoctorSession(found);
  return found;
}
