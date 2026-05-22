import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ScrollView, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, format } from 'date-fns';
import { bookSlot } from '../services/api';

const LANGUAGE_MAP = {
  ur: "اردو Urdu",
  ro: "Roman Urdu",
  en: "English"
};

export default function ProviderResultsScreen({ navigation, route }) {
  const { results, request } = route.params || {};
  const { session_id, intent, top_match, alternatives = [], trace_url } = results || {};

  const [expanded, setExpanded] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState({}); // Mapping of providerId -> rawISOString
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingProvider, setBookingProvider] = useState(null);
  
  // User booking details
  const [userName, setUserName] = useState('Aqib Raza');
  const [userPhone, setUserPhone] = useState('03001234567');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Intent details formatting
  const serviceType = intent?.service_type || "Service Expert";
  const rawTimeIso = intent?.time_iso;
  const timeLabel = rawTimeIso 
    ? format(parseISO(rawTimeIso), "eee, MMM d 'at' h:mm a") 
    : (intent?.time_preference || "As soon as possible");
  const langLabel = LANGUAGE_MAP[intent?.language_detected] || "Auto-detected";

  // Filter out any null alternatives or empty lists
  const validAlternatives = (alternatives || []).filter(item => item !== null);
  const displayProviders = expanded ? validAlternatives : [];

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Dialer Error", "Could not open dialer app.");
    });
  };

  const initiateBooking = (provider) => {
    const selectedSlot = selectedSlots[provider.id];
    if (!selectedSlot) {
      Alert.alert("Time Slot Required", `Please select an available slot for ${provider.name} before booking.`);
      return;
    }
    setBookingProvider(provider);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!userName.trim() || !userPhone.trim()) {
      Alert.alert("Fields Required", "Please provide your Name and Phone Number to complete the booking.");
      return;
    }

    setBookingLoading(true);
    try {
      const selectedSlot = selectedSlots[bookingProvider.id];
      const payload = {
        session_id,
        provider_id: bookingProvider.id,
        slot: selectedSlot,
        user_name: userName.trim(),
        user_phone: userPhone.trim(),
      };

      const response = await bookSlot(payload);
      
      setBookingModalVisible(false);
      // Navigate to Confirmation screen with the booking response and selected provider
      navigation.navigate('BookingConfirm', { 
        bookingResponse: response,
        booking: response?.booking,
        receipt: response?.receipt,
        bookingId: response?.booking?.booking_id || response?.booking_id,
        provider: bookingProvider,
        session_id: session_id
      });
    } catch (error) {
      console.error("Booking failed:", error);
      const errMsg = error?.response?.status === 409 
        ? "This slot has already been booked by another user. Please select a different slot." 
        : (error?.response?.data?.message || error.message || "An unexpected booking error occurred.");
      Alert.alert("Booking Failed", errMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  const formatSlot = (isoString) => {
    try {
      return format(parseISO(isoString), "eee h:mm a");
    } catch (e) {
      return isoString;
    }
  };

  const renderScoreBars = (provider) => {
    const scores = [
      { label: "Proximity", val: provider.proximity_score || 0, color: '#3b9eff' },
      { label: "Rating", val: provider.rating_score || 0, color: '#ffd060' },
      { label: "Availability", val: provider.availability_score || 0, color: '#00D4A8' }
    ];
    return (
      <View style={styles.scoreBarsSection}>
        {scores.map((s, idx) => (
          <View key={idx} style={styles.scoreBarRow}>
            <Text style={styles.scoreBarLabel}>{s.label}</Text>
            <View style={styles.scoreBarBg}>
              <View style={[styles.scoreBarFill, { width: `${s.val * 100}%`, backgroundColor: s.color }]} />
            </View>
            <Text style={styles.scoreBarVal}>{(s.val).toFixed(1)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderProviderCard = (provider, isBestMatch) => {
    const scoreVal = provider.score ? (provider.score).toFixed(2) : "0.00";
    const initials = provider.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const slots = provider.available_slots || [];
    const activeSelectedSlot = selectedSlots[provider.id];

    return (
      <View key={provider.id} style={[styles.card, isBestMatch && styles.bestMatchCard]}>
        
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>{scoreVal}/1.00</Text>
              </View>
            </View>
            
            <View style={styles.badgeRow}>
              {isBestMatch && (
                <View style={styles.bestMatchBadge}>
                  <Ionicons name="trophy" size={10} color="#050810" style={{ marginRight: 4 }} />
                  <Text style={styles.bestMatchBadgeText}>BEST MATCH</Text>
                </View>
              )}
              <View style={[styles.statusTag, provider.available ? styles.statusOnline : styles.statusOffline]}>
                <Text style={styles.statusTagText}>{provider.available ? "Available" : "Busy"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Categories & Price pills */}
        <View style={styles.detailsBlock}>
          <Text style={styles.categoryText}>{provider.service_categories.join(', ')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <Ionicons name="location-sharp" size={12} color="#e4eaf8" />
              <Text style={styles.infoPillText}>{provider.area} · {provider.distance_km ? `${provider.distance_km.toFixed(1)} km` : ''}</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="star" size={12} color="#ffd060" />
              <Text style={styles.infoPillText}>{provider.rating ? provider.rating.toFixed(1) : 'N/A'} ({provider.experience_years || 0} yrs exp)</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="cash-outline" size={12} color="#00D4A8" />
              <Text style={styles.infoPillText}>{provider.price_range}</Text>
            </View>
          </View>
        </View>

        {/* Reasoning Log */}
        {provider.reasoning && (
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningText}>
              <Ionicons name="bulb-outline" size={13} color="#ffd843" /> <Text style={{ fontStyle: 'italic' }}>{provider.reasoning}</Text>
            </Text>
          </View>
        )}

        {/* Expanded Progress Metrics */}
        {renderScoreBars(provider)}

        {/* Horizontal Available Slots pills */}
        {slots.length > 0 ? (
          <View style={styles.slotsSection}>
            <Text style={styles.slotsTitle}>Select Time Slot:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsScroll}>
              {slots.map((slotIso) => {
                const isSelected = activeSelectedSlot === slotIso;
                return (
                  <TouchableOpacity
                    key={slotIso}
                    style={[styles.slotPill, isSelected && styles.slotPillSelected]}
                    onPress={() => setSelectedSlots({ ...selectedSlots, [provider.id]: slotIso })}
                  >
                    <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                      {formatSlot(slotIso)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <Text style={styles.noSlotsText}>⚠️ No active time slots available</Text>
        )}

        {/* Call & Booking Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.callBtn} 
            onPress={() => handleCall(provider.phone || '03001234567')}
          >
            <Ionicons name="call" size={16} color="#3b9eff" style={{ marginRight: 6 }} />
            <Text style={styles.callBtnText}>Call Expert</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bookBtn, (!provider.available || slots.length === 0) && styles.disabledBtn]} 
            disabled={!provider.available || slots.length === 0}
            onPress={() => initiateBooking(provider)}
          >
            <Text style={styles.bookBtnText}>
              {provider.available ? 'Book Service' : 'Currently Busy'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  if (!top_match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={80} color="#ff4a4a" />
          <Text style={styles.emptyTitle}>No Matching Experts</Text>
          <Text style={styles.emptyText}>
            No service providers were found for "{serviceType}". Try adjusting your prompt.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.emptyBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Intent Info Bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Matching Experts</Text>
          <View style={styles.intentInfoCard}>
            <View style={styles.intentLabelRow}>
              <Ionicons name="bulb" size={14} color="#00D4A8" style={{ marginRight: 6 }} />
              <Text style={styles.intentLabel} numberOfLines={1}>
                You asked for: <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{serviceType}</Text>
              </Text>
            </View>
            <View style={styles.intentSubPills}>
              <View style={styles.miniTag}>
                <Ionicons name="calendar-outline" size={10} color="#8fa3c0" style={{ marginRight: 3 }} />
                <Text style={styles.miniTagText}>{timeLabel}</Text>
              </View>
              <View style={styles.miniTag}>
                <Ionicons name="language" size={10} color="#8fa3c0" style={{ marginRight: 3 }} />
                <Text style={styles.miniTagText}>{langLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Matches Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Top Matches Recommended</Text>
        </View>
        
        {renderProviderCard(top_match, true)}

        {/* Alternatives Section */}
        {validAlternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            {!expanded ? (
              <TouchableOpacity 
                style={styles.expandBtn} 
                onPress={() => setExpanded(true)}
              >
                <Text style={styles.expandBtnText}>Show {validAlternatives.length} more options</Text>
                <Ionicons name="chevron-down" size={18} color="#00D4A8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Alternative Providers</Text>
                </View>
                {displayProviders.map(provider => renderProviderCard(provider, false))}
                
                <TouchableOpacity 
                  style={styles.expandBtn} 
                  onPress={() => setExpanded(false)}
                >
                  <Text style={styles.expandBtnText}>Collapse options</Text>
                  <Ionicons name="chevron-up" size={18} color="#00D4A8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* Floating Agent Trace Button */}
      <TouchableOpacity 
        style={styles.traceFab}
        onPress={() => navigation.navigate('AgentTrace', { session_id })}
      >
        <Ionicons name="hardware-chip" size={24} color="#050810" />
        <Text style={styles.traceFabText}>Agent Trace</Text>
      </TouchableOpacity>

      {/* Booking Form Overlay Sheet Modal */}
      <Modal
        visible={bookingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Booking details</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)} disabled={bookingLoading}>
                <Ionicons name="close" size={24} color="#8fa3c0" />
              </TouchableOpacity>
            </View>

            {bookingProvider && (
              <ScrollView style={styles.modalScroll}>
                {/* Summary Info */}
                <View style={styles.modalSummaryBox}>
                  <Text style={styles.summaryLabel}>Provider</Text>
                  <Text style={styles.summaryValue}>{bookingProvider.name}</Text>

                  <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Category</Text>
                  <Text style={styles.summaryValue}>{bookingProvider.service_categories.join(', ')}</Text>

                  <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Selected Time</Text>
                  <Text style={styles.summaryValueSelected}>
                    {formatSlot(selectedSlots[bookingProvider.id])}
                  </Text>
                </View>

                {/* Form Fields */}
                <Text style={styles.inputLabel}>Your Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your name"
                  placeholderTextColor="#5a6a85"
                  value={userName}
                  onChangeText={setUserName}
                  editable={!bookingLoading}
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 03001234567"
                  placeholderTextColor="#5a6a85"
                  keyboardType="phone-pad"
                  value={userPhone}
                  onChangeText={setUserPhone}
                  editable={!bookingLoading}
                />

                {/* Confirm Button */}
                <TouchableOpacity 
                  style={[styles.confirmBookBtn, bookingLoading && styles.confirmBookBtnDisabled]} 
                  onPress={handleConfirmBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator size="small" color="#050810" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-sharp" size={20} color="#050810" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmBookBtnText}>Complete Booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5, marginBottom: 12 },
  
  intentInfoCard: {
    backgroundColor: '#0b0f1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  intentLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  intentLabel: { color: '#8fa3c0', fontSize: 14, flex: 1 },
  intentSubPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniTag: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#161f30', 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
  },
  miniTagText: { color: '#8fa3c0', fontSize: 11, fontWeight: '500' },
  
  sectionHeader: { marginVertical: 14, paddingLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#8fa3c0', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  card: { 
    backgroundColor: '#111827', 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    elevation: 4
  },
  bestMatchCard: { 
    borderColor: '#00D4A8', 
    borderWidth: 1.5,
    backgroundColor: '#0d1d26'
  },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59, 158, 255, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1, borderColor: 'rgba(59, 158, 255, 0.3)'
  },
  avatarText: { color: '#3b9eff', fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase' },
  headerInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1, marginRight: 8 },
  scoreBadge: {
    backgroundColor: 'rgba(0, 212, 168, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 168, 0.25)'
  },
  scoreBadgeText: { color: '#00D4A8', fontSize: 12, fontWeight: '800' },
  
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bestMatchBadge: { 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffd843', 
    paddingHorizontal: 6, paddingVertical: 2, 
    borderRadius: 6
  },
  bestMatchBadgeText: { color: '#050810', fontSize: 9, fontWeight: '900' },
  
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusOnline: { backgroundColor: 'rgba(0, 212, 168, 0.1)' },
  statusOffline: { backgroundColor: 'rgba(255, 74, 74, 0.1)' },
  statusTagText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  
  detailsBlock: { marginBottom: 14 },
  categoryText: { color: '#00D4A8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoPill: { 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1b2336',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  infoPillText: { color: '#e4eaf8', fontSize: 11, marginLeft: 4, fontWeight: '500' },
  
  reasoningCard: {
    backgroundColor: 'rgba(255, 216, 67, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#ffd843',
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  reasoningText: { color: '#e4eaf8', fontSize: 12, lineHeight: 18 },
  
  scoreBarsSection: {
    marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 10
  },
  scoreBarRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  scoreBarLabel: { color: '#8fa3c0', fontSize: 10, width: 75, fontWeight: '500' },
  scoreBarBg: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreBarVal: { color: '#FFF', fontSize: 10, fontWeight: '600', width: 20, textAlign: 'right' },
  
  slotsSection: { marginVertical: 12 },
  slotsTitle: { color: '#8fa3c0', fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  slotsScroll: { gap: 8, paddingVertical: 2 },
  slotPill: {
    backgroundColor: '#1b2336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  slotPillSelected: {
    backgroundColor: 'rgba(0, 212, 168, 0.1)',
    borderColor: '#00D4A8',
  },
  slotText: { color: '#8fa3c0', fontSize: 12, fontWeight: '600' },
  slotTextSelected: { color: '#00D4A8' },
  noSlotsText: { color: '#ff4a4a', fontSize: 11, fontWeight: '600', marginVertical: 10 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  callBtn: { 
    flexDirection: 'row', flex: 1, backgroundColor: 'rgba(59, 158, 255, 0.08)', 
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(59, 158, 255, 0.25)'
  },
  callBtnText: { color: '#3b9eff', fontWeight: 'bold', fontSize: 13 },
  bookBtn: { 
    flex: 1.4, backgroundColor: '#00D4A8', 
    paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
  },
  disabledBtn: { backgroundColor: '#3a4a65', opacity: 0.5 },
  bookBtnText: { color: '#050810', fontWeight: '800', fontSize: 14 },
  
  alternativesSection: { marginTop: 10 },
  expandBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0b0f1a', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0, 212, 168, 0.15)', marginVertical: 10
  },
  expandBtnText: { color: '#00D4A8', fontSize: 14, fontWeight: 'bold' },

  traceFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    backgroundColor: '#ffd843',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  traceFabText: { color: '#050810', fontWeight: '850', fontSize: 14, marginLeft: 6 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#8fa3c0', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#00D4A8', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  emptyBtnText: { color: '#050810', fontWeight: 'bold', fontSize: 16 },

  // Modal styling
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(5, 8, 16, 0.85)', justifyContent: 'flex-end' },
  modalSheet: { 
    backgroundColor: '#111827', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24, 
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  modalScroll: { marginBottom: 10 },
  modalSummaryBox: {
    backgroundColor: '#0b0f1a',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20
  },
  summaryLabel: { color: '#5a6a85', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#FFF', fontSize: 15, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  summaryValueSelected: { color: '#00D4A8', fontSize: 15, fontWeight: '750', marginTop: 2 },
  
  inputLabel: { color: '#8fa3c0', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  formInput: {
    backgroundColor: '#0b0f1a',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20
  },
  confirmBookBtn: {
    flexDirection: 'row',
    backgroundColor: '#00D4A8',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  confirmBookBtnDisabled: {
    backgroundColor: '#3a4a65',
    opacity: 0.7
  },
  confirmBookBtnText: { color: '#050810', fontSize: 16, fontWeight: '850' }
});
