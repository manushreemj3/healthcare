/**
 * DevMenu – offline simulation toggle (DEV builds only).
 *
 * Usage: Render once near the root of your app:
 *   import { DevMenu } from "@/components/health/DevMenu";
 *   ...
 *   <DevMenu />
 *
 * When enabled, useHealth().forceOffline is true and syncNow() will bail
 * with an "Offline" error so you can test the full pending-operation workflow
 * without toggling Wi-Fi.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import { useHealth } from "@/lib/health/store";

const IS_DEV = __DEV__;

export function DevMenu() {
  const { forceOffline, setForceOffline, isOnline, state, syncing } = useHealth();
  const [expanded, setExpanded] = useState(false);

  // Only render in dev builds
  if (!IS_DEV) return null;

  const pendingOps = state.operations.length;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.title}>🛠 Dev Menu</Text>

          {/* Force Offline Toggle */}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>Force Offline Mode</Text>
              <Text style={styles.sublabel}>
                {forceOffline
                  ? "⚠️ Simulating offline — ops are queued"
                  : isOnline
                  ? "✅ Online"
                  : "📵 No network"}
              </Text>
            </View>
            <Switch
              value={forceOffline}
              onValueChange={setForceOffline}
              trackColor={{ false: "#3a3a3c", true: "#ff6b35" }}
              thumbColor={forceOffline ? "#fff" : "#aaa"}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{pendingOps}</Text>
              <Text style={styles.statLabel}>Pending Ops</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{syncing ? "⏳" : isOnline ? "🟢" : "🔴"}</Text>
              <Text style={styles.statLabel}>Sync</Text>
            </View>
          </View>

          {forceOffline && (
            <Text style={styles.warning}>
              Toggle off to trigger an immediate sync of queued operations.
            </Text>
          )}
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, forceOffline && styles.fabOffline]}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>{forceOffline ? "📵" : "🛠"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    right: 16,
    zIndex: 9999,
    alignItems: "flex-end",
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#3a3a3c",
  },
  fabOffline: {
    backgroundColor: "#7c2d12",
    borderColor: "#ff6b35",
  },
  fabIcon: {
    fontSize: 20,
  },
  panel: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    minWidth: 240,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "#3a3a3c",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 12,
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowText: {
    flex: 1,
    marginRight: 10,
  },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  sublabel: {
    color: "#8e8e93",
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  stat: {
    alignItems: "center",
    backgroundColor: "#2c2c2e",
    borderRadius: 8,
    padding: 8,
    flex: 1,
  },
  statVal: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: "#8e8e93",
    fontSize: 10,
    marginTop: 2,
  },
  warning: {
    color: "#ff9f0a",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
});
