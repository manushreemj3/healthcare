import React, { createContext, useContext, useEffect, useState, useCallback, type PropsWithChildren } from "react";
import {
  type DoctorProfile,
  type CreateDoctorInput,
  getStoredDoctorProfile,
  getRegisteredDoctors,
  storeDoctorSession,
  clearDoctorSession,
  createDoctorProfile,
  authenticateDoctor,
  PRESET_DOCTORS,
} from "./doctorAuth";

type DoctorAuthContextValue = {
  doctor: DoctorProfile | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  registeredDoctors: DoctorProfile[];
  signIn: (doctorIdOrEmail: string, passcode: string) => Promise<void>;
  signUp: (input: CreateDoctorInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const DoctorAuthContext = createContext<DoctorAuthContextValue | undefined>(undefined);

export function DoctorAuthProvider({ children }: PropsWithChildren) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [registeredDoctors, setRegisteredDoctors] = useState<DoctorProfile[]>(PRESET_DOCTORS);

  useEffect(() => {
    async function init() {
      try {
        const stored = await getStoredDoctorProfile();
        if (stored) {
          setDoctor(stored);
        }
        const registered = await getRegisteredDoctors();
        setRegisteredDoctors(registered);
      } catch (err) {
        console.error("Doctor auth initialization failed:", err);
      } finally {
        setIsAuthReady(true);
      }
    }
    void init();
  }, []);

  const signIn = useCallback(async (doctorIdOrEmail: string, passcode: string) => {
    const authed = await authenticateDoctor(doctorIdOrEmail, passcode);
    setDoctor(authed);
    const updated = await getRegisteredDoctors();
    setRegisteredDoctors(updated);
  }, []);

  const signUp = useCallback(async (input: CreateDoctorInput) => {
    const created = await createDoctorProfile(input);
    setDoctor(created);
    const updated = await getRegisteredDoctors();
    setRegisteredDoctors(updated);
  }, []);

  const signOut = useCallback(async () => {
    await clearDoctorSession();
    setDoctor(null);
  }, []);

  const value: DoctorAuthContextValue = {
    doctor,
    isAuthenticated: !!doctor,
    isAuthReady,
    registeredDoctors,
    signIn,
    signUp,
    signOut,
  };

  return <DoctorAuthContext.Provider value={value}>{children}</DoctorAuthContext.Provider>;
}

export function useDoctorAuth() {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error("useDoctorAuth must be used within DoctorAuthProvider");
  }
  return context;
}
