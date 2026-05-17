import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AgentThinkingScreen({ navigation, route }) {
  const { request } = route.params || { request: 'Searching for service' };

  useEffect(() => {
    const timer = setTimeout(() => {
      let serviceType = "AC Technician";
      const text = request.toLowerCase();
      if (text.includes("ac")) serviceType = "AC Technician";
      else if (text.includes("plumber")) serviceType = "Plumber";
      else if (text.includes("electric")) serviceType = "Electrician";
      else if (text.includes("barber")) serviceType = "Barber";
      else if (text.includes("tutor")) serviceType = "Tutor";
      else if (text.includes("carpenter")) serviceType = "Carpenter";
      else if (text.includes("fridge")) serviceType = "Refrigerator Repair";
      else if (text.includes("mechanic")) serviceType = "Car Mechanic";
      
      navigation.replace('ProviderResults', { service: serviceType, location: 'G-13' });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, request]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00D4A8" />
      <Text style={styles.title}>Agent is thinking...</Text>
      <Text style={styles.subtitle}>Analyzing request: "{request}"</Text>
      
      <View style={styles.stepsContainer}>
        <View style={styles.stepRow}>
          <Ionicons name="checkmark-circle" size={18} color="#00D4A8" />
          <Text style={styles.step}>Intent extracted</Text>
        </View>
        <View style={styles.stepRow}>
          <Ionicons name="search" size={18} color="#ff8c42" />
          <Text style={[styles.step, { color: '#ff8c42' }]}>Searching best providers near you...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#00D4A8', marginTop: 20, marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#8fa3c0', textAlign: 'center', fontStyle: 'italic', marginBottom: 40 },
  stepsContainer: { width: '100%', backgroundColor: '#111827', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  step: { color: '#e4eaf8', fontSize: 14, marginLeft: 10 }
});
