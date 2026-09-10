import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from "react-native";
import { useHealth } from "@/lib/health/store";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subheader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  warningCard: {
    backgroundColor: "#FFEBEE",
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    color: "#C62828",
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  hospitalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hospitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  hospitalIcon: {
    marginRight: 12,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2369A5",
    flex: 1,
  },
  hospitalType: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  hospitalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 12,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  detailLabel: {
    fontWeight: "600",
    color: "#1a1a1a",
  },
  bedsInfo: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bedsHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2369A5",
    marginBottom: 8,
  },
  bedsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  bedStat: {
    alignItems: "center",
  },
  bedStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2369A5",
  },
  bedStatLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#2369A5",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCall: {
    backgroundColor: "#4CAF50",
  },
  buttonEmergency: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  distanceBadge: {
    backgroundColor: "#4CAF50",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  distanceText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  facilitiesList: {
    marginTop: 12,
  },
  facilitiesTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  facilityItem: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    paddingLeft: 8,
  },
});

type NearbyHospitalsScreenProps = {
  currentFacilityId?: string;
  maxDistance?: number;
};

export function NearbyHospitalsScreen({ currentFacilityId, maxDistance = 15 }: NearbyHospitalsScreenProps) {
  const health = useHealth();
  const [callInProgress, setCallInProgress] = useState(false);

  const nearbyHospitals = health
    .getNearbyHospitalsWithBeds(maxDistance)
    .filter((h) => !currentFacilityId || h.id !== currentFacilityId);

  const handleCall = async (phoneNumber: string) => {
    try {
      setCallInProgress(true);
      const phoneUrl = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Error", "Cannot open phone dialer");
      }
    } catch {
      Alert.alert("Error", "Failed to open phone dialer");
    } finally {
      setCallInProgress(false);
    }
  };

  const handleEmergency = async (phoneNumber: string) => {
    Alert.alert("Emergency Call", `Calling ${phoneNumber}?`, [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Call",
        onPress: () => handleCall(phoneNumber),
        style: "destructive",
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Nearby Hospitals with Beds</Text>
      <Text style={styles.subheader}>Available options within {maxDistance} km</Text>

      {/* Warning Card */}
      <View style={styles.warningCard}>
        <MaterialIcons name="warning" size={24} color="#F44336" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          Current hospital beds are full. Please check nearby facilities for available beds.
        </Text>
      </View>

      {/* Hospitals List */}
      {nearbyHospitals.length > 0 ? (
        <View>
          {nearbyHospitals.map((hospital) => (
            <View key={hospital.id} style={styles.hospitalCard}>
              {/* Header with distance */}
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>📍 {hospital.distanceKm.toFixed(1)} km away</Text>
              </View>

              <View style={styles.hospitalHeader}>
                <MaterialIcons name="local-hospital" size={24} color="#2369A5" style={styles.hospitalIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalName}>{hospital.name}</Text>
                  <Text style={styles.hospitalType}>{hospital.type}</Text>
                </View>
              </View>

              {/* Hospital Details */}
              <View style={styles.hospitalDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="location-on" size={18} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{hospital.address}</Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={18} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{hospital.phone}</Text>
                </View>

                {hospital.emergencyHotline && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="emergency" size={18} color="#F44336" style={styles.detailIcon} />
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Emergency: </Text>
                      {hospital.emergencyHotline}
                    </Text>
                  </View>
                )}

                {hospital.ambulanceAvailable && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="ambulance" size={18} color="#FF9800" style={styles.detailIcon} />
                    <Text style={styles.detailText}>24/7 Ambulance Available</Text>
                  </View>
                )}
              </View>

              {/* Bed Information */}
              <View style={styles.bedsInfo}>
                <Text style={styles.bedsHeader}>Available Beds</Text>
                <View style={styles.bedsRow}>
                  <View style={styles.bedStat}>
                    <Text style={styles.bedStatValue}>{hospital.totalBeds}</Text>
                    <Text style={styles.bedStatLabel}>Total</Text>
                  </View>
                  <View style={styles.bedStat}>
                    <Text style={[styles.bedStatValue, { color: "#4CAF50" }]}>{hospital.availableBeds}</Text>
                    <Text style={styles.bedStatLabel}>Available</Text>
                  </View>
                  <View style={styles.bedStat}>
                    <Text style={[styles.bedStatValue, { color: "#2196F3" }]}>{hospital.icuBedsAvailable}</Text>
                    <Text style={styles.bedStatLabel}>ICU</Text>
                  </View>
                </View>
              </View>

              {/* Facilities */}
              {hospital.facilities && hospital.facilities.length > 0 && (
                <View style={styles.facilitiesList}>
                  <Text style={styles.facilitiesTitle}>Available Facilities:</Text>
                  {hospital.facilities.map((facility, idx) => (
                    <View key={idx} style={styles.detailRow}>
                      <MaterialIcons name="check-circle" size={14} color="#4CAF50" style={styles.detailIcon} />
                      <Text style={styles.detailText}>{facility}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonCall]}
                  onPress={() => handleCall(hospital.phone)}
                  disabled={callInProgress}
                >
                  <MaterialIcons name="phone" size={18} color="white" />
                  <Text style={styles.buttonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonEmergency]}
                  onPress={() => handleEmergency(hospital.emergencyHotline || hospital.phone)}
                  disabled={callInProgress}
                >
                  <MaterialIcons name="call" size={18} color="white" />
                  <Text style={styles.buttonText}>Emergency</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="search-off" size={64} color="#ccc" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No nearby hospitals found</Text>
          <Text style={styles.emptySubtext}>Try increasing the search radius or contacting your district health office</Text>
        </View>
      )}
    </ScrollView>
  );
}
