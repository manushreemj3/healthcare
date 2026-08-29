import { describe, expect, it, vi } from "vitest";

const memoryStore: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => memoryStore[key] ?? null),
    setItem: vi.fn(async (key: string, val: string) => {
      memoryStore[key] = val;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete memoryStore[key];
    }),
  },
}));

import {
  createDoctorProfile,
  authenticateDoctor,
  PRESET_DOCTORS,
  PRESET_DEFAULT_PIN,
} from "../lib/health/doctorAuth";

describe("Doctor Authentication & Profile Creation", () => {
  it("includes default verified preset doctors", () => {
    expect(PRESET_DOCTORS.length).toBeGreaterThanOrEqual(3);
    const asha = PRESET_DOCTORS.find((d) => d.name.includes("Asha"));
    expect(asha).toBeDefined();
    expect(asha?.specialization).toContain("Community Medicine");
    expect(asha?.doctorId).toBe("MCI-48201");
  });

  it("creates a doctor profile with formatted prefix and details", async () => {
    const profile = await createDoctorProfile({
      name: "Sunita Patel",
      doctorId: "MCI-99881",
      specialization: "Pediatrics / Child Health",
      facilityName: "Nandipur PHC",
      phone: "9876543210",
    });

    expect(profile.name).toBe("Dr. Sunita Patel");
    expect(profile.doctorId).toBe("MCI-99881");
    expect(profile.specialization).toBe("Pediatrics / Child Health");
    expect(profile.facilityName).toBe("Nandipur PHC");
    expect(profile.role).toBe("doctor");
  });

  it("authenticates existing doctor by MCI ID with correct PIN", async () => {
    const doctor = await authenticateDoctor("MCI-48201", PRESET_DEFAULT_PIN);
    expect(doctor).toBeDefined();
    expect(doctor.name).toBe("Dr. Asha Verma");
  });

  it("rejects login with wrong password", async () => {
    await expect(authenticateDoctor("MCI-48201", "9999")).rejects.toThrow(
      "Incorrect password or PIN",
    );
  });

  it("throws when doctor ID is not found", async () => {
    await expect(authenticateDoctor("MCI-000000", "1234")).rejects.toThrow(
      "No doctor found",
    );
  });
});
