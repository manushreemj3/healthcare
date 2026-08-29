import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useDoctorAuth } from "@/lib/health/DoctorAuthContext";
import { DoctorAuthScreen } from "./DoctorAuthScreen";

export function DoctorAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthReady } = useDoctorAuth();

  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#087E7B" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <DoctorAuthScreen />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
});
