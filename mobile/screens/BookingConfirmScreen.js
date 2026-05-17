import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BookingConfirmScreen({ navigation, route }) {
  const { provider } = route.params || {};
  const [eta, setEta] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setEta(prev => (prev > 0 ? prev - 1 : 0));
    }, 60000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#00D4A8" />
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your expert is on their way</Text>

        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Booking ID</Text>
          <Text style={styles.idText}>KHD-{Math.floor(1000 + Math.random() * 9000)}</Text>
          <Text style={styles.idSub}>Save this for reference</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Provider</Text>
            <Text style={styles.value}>{provider?.name || 'Ustad Asif AC'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{provider?.service_categories?.[0] || 'AC Technician'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusWrap}>
              <Ionicons name="ellipse" size={8} color="#00D4A8" style={{marginRight: 6}} />
              <Text style={[styles.value, { color: '#00D4A8' }]}>Confirmed</Text>
            </View>
          </View>
        </View>

        <View style={styles.processingCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
            <Ionicons name="bicycle" size={20} color="#ff8c42" style={{marginRight: 8}} />
            <Text style={styles.processingTitle}>Provider is on the way!</Text>
          </View>
          <Text style={styles.etaText}>Arriving in approx <Text style={{fontWeight: 'bold', color: '#ff8c42'}}>{eta} mins</Text></Text>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <View style={styles.followupCard}>
          <View style={styles.followupRow}>
            <Ionicons name="notifications" size={16} color="#9d78ff" style={styles.followupIcon} />
            <Text style={styles.followupText}>Reminder will be sent 1 hour before</Text>
          </View>
          <View style={styles.followupRow}>
            <Ionicons name="phone-portrait" size={16} color="#9d78ff" style={styles.followupIcon} />
            <Text style={styles.followupText}>Provider has been notified</Text>
          </View>
          <View style={styles.followupRow}>
            <Ionicons name="chatbubbles" size={16} color="#9d78ff" style={styles.followupIcon} />
            <Text style={styles.followupText}>Feedback will be requested after service</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.popToTop()}>
          <Ionicons name="home" size={20} color="#0D1525" style={{marginRight: 8}} />
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  content: { padding: 20, alignItems: 'center', marginTop: 20, paddingBottom: 40 },
  iconContainer: { marginBottom: 10, shadowColor: '#00D4A8', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#00D4A8', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#8fa3c0', marginBottom: 20, textAlign: 'center' },
  idCard: { width: '100%', borderColor: '#00D4A8', borderWidth: 1, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(0,212,168,0.05)' },
  idLabel: { color: '#8fa3c0', fontSize: 12, marginBottom: 5 },
  idText: { color: '#FFF', fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
  idSub: { color: '#5a6a85', fontSize: 10, marginTop: 5 },
  detailsCard: { width: '100%', backgroundColor: '#111827', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  label: { color: '#8fa3c0', fontSize: 14 },
  value: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  statusWrap: { flexDirection: 'row', alignItems: 'center' },
  processingCard: { width: '100%', backgroundColor: 'rgba(255,140,66,0.1)', borderColor: 'rgba(255,140,66,0.4)', borderWidth: 1, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20 },
  processingTitle: { color: '#ff8c42', fontSize: 16, fontWeight: 'bold' },
  etaText: { color: '#FFF', fontSize: 14, marginBottom: 12, marginTop: 5 },
  progressBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { width: '60%', height: '100%', backgroundColor: '#ff8c42', borderRadius: 3 },
  followupCard: { width: '100%', padding: 15, backgroundColor: 'rgba(157,120,255,0.05)', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(157,120,255,0.2)' },
  followupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  followupIcon: { marginRight: 10 },
  followupText: { color: '#9d78ff', fontSize: 13, flex: 1 },
  btn: { flexDirection: 'row', width: '100%', backgroundColor: '#00D4A8', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#0D1525', fontSize: 16, fontWeight: 'bold' }
});
