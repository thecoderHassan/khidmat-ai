import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { parseISO, format } from 'date-fns';
import { getFollowupActions, updateBookingStatus, completeBooking, getBookingDetails } from '../services/api';

export default function BookingConfirmScreen({ navigation, route }) {
  const { bookingResponse, provider, session_id } = route.params || {};
  
  const [booking, setBooking] = useState(bookingResponse?.booking || {});
  const [receipt, setReceipt] = useState(bookingResponse?.receipt || null);
  const [actions, setActions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  // Local feedback modal state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const bookingId = booking?.booking_id || bookingResponse?.booking_id || "BK-UNKNOWN";
  const activeSessionId = session_id || booking?.session_id;

  // Fetch contextual follow-up actions and latest booking details on mount
  useEffect(() => {
    fetchLatestDetails();
    fetchFollowup();
  }, [bookingId]);

  const fetchLatestDetails = async () => {
    if (!bookingId || bookingId === "BK-UNKNOWN") return;
    try {
      const data = await getBookingDetails(bookingId);
      if (data) {
        setBooking(data);
      }
    } catch (e) {
      console.warn("Could not fetch latest booking details on mount:", e);
    }
  };

  const fetchFollowup = async () => {
    if (!bookingId || bookingId === "BK-UNKNOWN") return;
    setActionsLoading(true);
    try {
      const response = await getFollowupActions(bookingId);
      if (response && response.actions) {
        setActions(response.actions);
      }
    } catch (e) {
      console.warn("Could not fetch followup actions:", e);
      // Fallback actions if API fails
      setActions([
        { action: "reminder", label: "Set Reminder", payload: {} },
        { action: "contact", label: "Contact Expert", payload: { phone: booking?.provider_phone || provider?.phone } },
        { action: "rebook", label: "Rebook Service", payload: {} },
        { action: "rate_service", label: "Rate Service", payload: {} }
      ]);
    } finally {
      setActionsLoading(false);
    }
  };

  // Perform status transitions
  const handleStartService = async () => {
    setLoading(true);
    try {
      const updated = await updateBookingStatus(bookingId, "in_progress");
      setBooking(updated?.booking || updated || { ...booking, status: "in_progress" });
      Alert.alert("Status Updated", "Service has successfully started!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to update status to in-progress.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteService = async () => {
    setLoading(true);
    try {
      const updated = await completeBooking(bookingId);
      setBooking(updated?.booking || updated || { ...booking, status: "completed" });
      Alert.alert("Service Delivered", "Work marked as complete. Thank you!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to complete service.");
    } finally {
      setLoading(false);
    }
  };

  // Action Triggers
  const triggerAction = (act) => {
    switch (act.action) {
      case 'reminder':
        Alert.alert("Reminder Set", "Your reminder has been scheduled for 1 hour prior to your booking slot.", [{ text: "Awesome" }]);
        break;

      case 'contact':
        const phone = act.payload?.phone || booking?.provider_phone || provider?.phone || '03001234567';
        Linking.openURL(`tel:${phone}`).catch(() => {
          Alert.alert("Dialer Error", "Could not open dialer app.");
        });
        break;

      case 'rebook':
        // Prefill input on home screen
        navigation.navigate('Chat', { 
          prefilledText: `Mujhe dobara ${booking?.service_type || 'AC Technician'} ki zaroorat hai` 
        });
        break;

      case 'rate_service':
        setFeedbackSubmitted(false);
        setRating(5);
        setFeedbackVisible(true);
        break;

      default:
        Alert.alert("Action Alert", act.label || "Action clicked!");
        break;
    }
  };

  const handleFeedbackSubmit = () => {
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackVisible(false);
      Alert.alert("Thank You", `Saved your ${rating}-star feedback locally!`);
    }, 1200);
  };

  const formatSlot = (isoString) => {
    if (!isoString) return 'As scheduled';
    try {
      return format(parseISO(isoString), "eee, MMM d 'at' h:mm a");
    } catch (e) {
      return isoString;
    }
  };

  // Color badges based on status
  const getBadgeStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { bg: 'rgba(59, 158, 255, 0.1)', border: 'rgba(59, 158, 255, 0.3)', text: '#3b9eff', label: 'Confirmed' };
      case 'in_progress':
        return { bg: 'rgba(255, 208, 96, 0.1)', border: 'rgba(255, 208, 96, 0.3)', text: '#ffd060', label: 'In Progress' };
      case 'completed':
        return { bg: 'rgba(0, 212, 168, 0.1)', border: 'rgba(0, 212, 168, 0.3)', text: '#00D4A8', label: 'Completed' };
      case 'cancelled':
        return { bg: 'rgba(143, 163, 192, 0.1)', border: 'rgba(143, 163, 192, 0.3)', text: '#8fa3c0', label: 'Cancelled' };
      default:
        return { bg: 'rgba(59, 158, 255, 0.1)', border: 'rgba(59, 158, 255, 0.3)', text: '#3b9eff', label: 'Confirmed' };
    }
  };

  const badge = getBadgeStyles(booking?.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Animated Confirmation Checkmark */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={88} color="#00D4A8" />
        </View>
        <Text style={styles.title}>Booked successfully!</Text>
        <Text style={styles.subtitle}>
          {booking?.provider_name || provider?.name} is ready for you
        </Text>

        {/* Booking ID Plate */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>BOOKING ID REFERENCE</Text>
          <Text style={styles.idText}>{bookingId}</Text>
          <Text style={styles.idSub}>Give this code to your provider upon arrival</Text>
        </View>

        {/* Dynamic Status Display Card */}
        <View style={[styles.statusBannerCard, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <View style={styles.statusRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="ellipse" size={10} color={badge.text} style={{ marginRight: 8 }} />
              <Text style={[styles.statusText, { color: badge.text }]}>Status: {badge.label}</Text>
            </View>
            <Text style={styles.etaText}>
              {booking?.status === 'confirmed' ? 'On Schedule' : booking?.status === 'in_progress' ? 'Active Now' : 'Delivered'}
            </Text>
          </View>
        </View>

        {/* Expandable Receipt Card */}
        <View style={styles.receiptContainer}>
          <TouchableOpacity 
            style={styles.receiptHeader}
            onPress={() => setReceiptExpanded(!receiptExpanded)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={18} color="#00D4A8" style={{ marginRight: 8 }} />
              <Text style={styles.receiptTitle}>Service Invoice Receipt</Text>
            </View>
            <Ionicons 
              name={receiptExpanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#8fa3c0" 
            />
          </TouchableOpacity>

          {receiptExpanded && (
            <View style={styles.receiptBody}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Expert Provider</Text>
                <Text style={styles.receiptVal}>{booking?.provider_name || provider?.name || "Ustad"}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Service Category</Text>
                <Text style={styles.receiptVal}>{booking?.service_type || provider?.service_categories?.[0]}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Appointment Time</Text>
                <Text style={styles.receiptVal}>{formatSlot(booking?.slot)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Customer Phone</Text>
                <Text style={[styles.receiptVal, { color: '#3b9eff' }]} onPress={() => Linking.openURL(`tel:${booking?.user_phone}`)}>
                  {booking?.user_phone}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Rating / Experience</Text>
                <Text style={styles.receiptVal}>⭐ {provider?.rating || "4.8"} ({provider?.experience_years || 10} yrs)</Text>
              </View>
              <View style={[styles.receiptRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.receiptLabelBold}>Est. Cost Range</Text>
                <Text style={styles.receiptValBold}>{provider?.price_range || "Rs 1,000 - 3,000"}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Contextual Follow-up Action Grid */}
        <Text style={styles.followupHeader}>Actions & Quick Assistance</Text>
        {actionsLoading ? (
          <ActivityIndicator size="small" color="#00D4A8" style={{ marginVertical: 15 }} />
        ) : (
          <View style={styles.actionGrid}>
            {actions.map((act, index) => {
              let iconName = "sparkles-outline";
              let btnStyle = styles.actionBtn;
              let txtStyle = styles.actionBtnText;

              if (act.action === 'reminder') { iconName = "alarm-outline"; }
              else if (act.action === 'contact') { iconName = "call-outline"; btnStyle = [styles.actionBtn, styles.actionBtnBlue]; txtStyle = [styles.actionBtnText, styles.actionBtnTextBlue]; }
              else if (act.action === 'rebook') { iconName = "refresh-outline"; }
              else if (act.action === 'rate_service') { iconName = "star-outline"; }

              return (
                <TouchableOpacity key={index} style={btnStyle} onPress={() => triggerAction(act)}>
                  <Ionicons name={iconName} size={18} color={act.action === 'contact' ? '#3b9eff' : '#00D4A8'} style={{ marginRight: 6 }} />
                  <Text style={txtStyle}>{act.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Status Transition Control Buttons */}
        <View style={styles.transitionBlock}>
          {loading ? (
            <ActivityIndicator size="large" color="#00D4A8" style={{ marginVertical: 10 }} />
          ) : (
            <>
              {booking?.status === 'confirmed' && (
                <TouchableOpacity style={styles.statusConfirmBtn} onPress={handleStartService}>
                  <Ionicons name="play-sharp" size={20} color="#050810" style={{ marginRight: 6 }} />
                  <Text style={styles.statusConfirmBtnText}>Mark as Started</Text>
                </TouchableOpacity>
              )}

              {booking?.status === 'in_progress' && (
                <TouchableOpacity style={styles.statusDoneBtn} onPress={handleCompleteService}>
                  <Ionicons name="checkmark-done" size={20} color="#050810" style={{ marginRight: 6 }} />
                  <Text style={styles.statusDoneBtnText}>Mark as Done</Text>
                </TouchableOpacity>
              )}

              {booking?.status === 'completed' && (
                <View style={styles.completedBadgeRow}>
                  <Ionicons name="checkbox" size={22} color="#00D4A8" />
                  <Text style={styles.completedBadgeText}>Service delivered successfully</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Standard Navigation Controls */}
        <View style={styles.bottomNavGroup}>
          <TouchableOpacity 
            style={styles.traceBtn} 
            onPress={() => navigation.navigate('AgentTrace', { session_id: activeSessionId })}
          >
            <Ionicons name="hardware-chip-outline" size={18} color="#ffd843" style={{ marginRight: 6 }} />
            <Text style={styles.traceBtnText}>See agent reasoning</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Local Star Rating Modal */}
      <Modal
        visible={feedbackVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Rate Your Experience</Text>
            
            {feedbackSubmitted ? (
              <View style={styles.submittedBox}>
                <Ionicons name="happy" size={50} color="#00D4A8" style={{ marginBottom: 10 }} />
                <Text style={styles.submittedText}>Feedback Saved! Thank you!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.feedbackSubtitle}>How was the service provided by {booking?.provider_name || provider?.name}?</Text>
                
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <Ionicons 
                        name={star <= rating ? "star" : "star-outline"} 
                        size={38} 
                        color="#ffd060" 
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.feedbackModalActions}>
                  <TouchableOpacity style={styles.cancelRateBtn} onPress={() => setFeedbackVisible(false)}>
                    <Text style={styles.cancelRateBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.submitRateBtn} onPress={handleFeedbackSubmit}>
                    <Text style={styles.submitRateBtnText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  content: { padding: 20, alignItems: 'center', paddingBottom: 60 },
  iconContainer: { 
    marginBottom: 10, 
    marginTop: 20,
    shadowColor: '#00D4A8', 
    shadowOpacity: 0.3, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 8 }, 
    elevation: 8 
  },
  title: { fontSize: 26, fontWeight: '900', color: '#00D4A8', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#8fa3c0', marginBottom: 24, textAlign: 'center', fontWeight: '500' },
  
  idCard: { 
    width: '100%', 
    borderColor: 'rgba(0, 212, 168, 0.3)', 
    borderWidth: 1.5, 
    borderRadius: 16, 
    padding: 20, 
    alignItems: 'center', 
    marginBottom: 20, 
    backgroundColor: 'rgba(0,212,168,0.04)' 
  },
  idLabel: { color: '#00D4A8', fontSize: 11, fontWeight: '750', letterSpacing: 1, marginBottom: 5 },
  idText: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  idSub: { color: '#5a6a85', fontSize: 11, marginTop: 6, textAlign: 'center' },
  
  statusBannerCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '750' },
  etaText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  receiptContainer: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 24,
    overflow: 'hidden'
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0b0f1a'
  },
  receiptTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  receiptBody: {
    padding: 16,
    gap: 12
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)'
  },
  receiptLabel: { color: '#8fa3c0', fontSize: 13 },
  receiptLabelBold: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  receiptVal: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  receiptValBold: { color: '#00D4A8', fontSize: 14, fontWeight: '800' },

  followupHeader: { color: '#8fa3c0', fontSize: 12, fontWeight: '750', textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginBottom: 12, paddingLeft: 4 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 24
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderColor: 'rgba(0, 212, 168, 0.2)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    width: '48.5%'
  },
  actionBtnBlue: {
    borderColor: 'rgba(59, 158, 255, 0.2)'
  },
  actionBtnText: { color: '#00D4A8', fontSize: 12, fontWeight: '700' },
  actionBtnTextBlue: { color: '#3b9eff' },

  transitionBlock: {
    width: '100%',
    marginBottom: 30
  },
  statusConfirmBtn: {
    flexDirection: 'row',
    backgroundColor: '#ffd843',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  statusConfirmBtnText: { color: '#050810', fontSize: 16, fontWeight: '850' },
  statusDoneBtn: {
    flexDirection: 'row',
    backgroundColor: '#00D4A8',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  statusDoneBtnText: { color: '#050810', fontSize: 16, fontWeight: '850' },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 168, 0.08)',
    borderColor: 'rgba(0, 212, 168, 0.25)',
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    width: '100%'
  },
  completedBadgeText: { color: '#00D4A8', fontSize: 15, fontWeight: '750', marginLeft: 8 },

  bottomNavGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 12
  },
  traceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 216, 67, 0.05)',
    borderColor: 'rgba(255, 216, 67, 0.25)',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%'
  },
  traceBtnText: { color: '#ffd843', fontSize: 15, fontWeight: '700' },
  
  homeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  homeBtnText: { color: '#8fa3c0', fontSize: 14, fontWeight: '600' },

  // Feedback Modal Style
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 8, 16, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  feedbackCard: { 
    backgroundColor: '#111827', 
    borderRadius: 20, 
    padding: 24, 
    width: '100%', 
    maxWidth: 340, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  feedbackTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  feedbackSubtitle: { color: '#8fa3c0', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  feedbackModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelRateBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1b2336', alignItems: 'center' },
  cancelRateBtnText: { color: '#8fa3c0', fontWeight: 'bold', fontSize: 14 },
  submitRateBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#00D4A8', alignItems: 'center' },
  submitRateBtnText: { color: '#050810', fontWeight: 'bold', fontSize: 14 },
  submittedBox: { padding: 20, alignItems: 'center' },
  submittedText: { color: '#00D4A8', fontSize: 16, fontWeight: 'bold' }
});
