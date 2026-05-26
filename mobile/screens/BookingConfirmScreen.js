import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Linking, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { parseISO, format } from 'date-fns';
import { getFollowupActions, updateBookingStatus, completeBooking, getBookingDetails, cancelBooking } from '../services/api';

export default function BookingConfirmScreen({ navigation, route }) {
  const { bookingResponse, booking: paramBooking, receipt: paramReceipt, bookingId: paramBookingId, provider, session_id } = route.params || {};
  
  const [booking, setBooking] = useState(paramBooking || bookingResponse?.booking || {});
  const [receipt, setReceipt] = useState(paramReceipt || bookingResponse?.receipt || null);
  const [actions, setActions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  // Local feedback/review modal state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Cancellation modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const bookingId = booking?.booking_id || paramBookingId || bookingResponse?.booking_id || "BK-UNKNOWN";
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
      const baseActions = [
        { action: "reminder", label: "Remind me 1 hour before", payload: {} },
        { action: "contact", label: `Call ${booking?.provider_name || provider?.name || 'Expert'}`, payload: { phone: booking?.provider_phone || provider?.phone } },
        { action: "book_another", label: "Book Another Service", payload: {} }
      ];
      // Rate service only shown after completion
      if (booking?.status === 'completed') {
        baseActions.push({ action: "rate_service", label: `Rate ${booking?.provider_name || provider?.name || 'Service'}`, payload: {} });
      }
      setActions(baseActions);
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
      // Auto-show review modal after completion
      setTimeout(() => {
        setFeedbackSubmitted(false);
        setRating(5);
        setReviewComment('');
        setFeedbackVisible(true);
      }, 500);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to complete service.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      Alert.alert("Reason Required", "Please provide a reason for cancellation (at least 5 characters).");
      return;
    }
    setCancelLoading(true);
    try {
      const updated = await cancelBooking(bookingId, trimmedReason);
      setBooking(updated?.booking || updated || { ...booking, status: "cancelled" });
      setCancelModalVisible(false);
      setCancelReason('');
      Alert.alert("Booking Cancelled", "Your booking has been cancelled successfully.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to cancel booking. Please try again.");
    } finally {
      setCancelLoading(false);
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
      case 'book_another':
        // Book another service — user should go home and book fresh
        navigation.popToTop();
        break;

      case 'rate_service':
        setFeedbackSubmitted(false);
        setRating(5);
        setReviewComment('');
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
                <Text style={styles.receiptLabel}>Rating / Experience</Text>
                <Text style={styles.receiptVal}>⭐ {provider?.rating || "4.8"} ({provider?.experience_years || 10} yrs)</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Scheduled</Text>
                <Text style={styles.receiptVal}>{formatSlot(booking?.slot)}</Text>
              </View>

              {/* Dynamic Billing Information */}
              {receipt?.billing ? (
                <>
                  <View style={[styles.receiptRow, { marginTop: 8, borderBottomWidth: 0, paddingBottom: 4 }]}>
                    <Text style={[styles.receiptLabelBold, { color: '#8fa3c0' }]}>Billing</Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
                    <Text style={styles.receiptLabel}>Base fare</Text>
                    <Text style={styles.receiptVal}>Rs {receipt.billing.base_fare_pkr}</Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
                    <Text style={styles.receiptLabel}>Visit charges</Text>
                    <Text style={styles.receiptVal}>Rs {receipt.billing.visiting_charges_pkr}</Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0, paddingBottom: 8 }]}>
                    <Text style={styles.receiptLabel}>Rating premium</Text>
                    <Text style={styles.receiptVal}>Rs {receipt.billing.rating_premium_pkr}</Text>
                  </View>
                  <View style={[styles.receiptRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 10, paddingBottom: 8 }]}>
                    <Text style={styles.receiptLabelBold}>Total</Text>
                    <Text style={styles.receiptValBold}>Rs {receipt.billing.total_payable_pkr}</Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                    <Text style={styles.receiptLabel}>Payment</Text>
                    <Text style={styles.receiptVal}>{receipt.billing.payment_method}</Text>
                  </View>
                </>
              ) : (
                <View style={[styles.receiptRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={styles.receiptLabelBold}>Est. Cost Range</Text>
                  <Text style={styles.receiptValBold}>{provider?.price_range || "Rs 1,000 - 3,000"}</Text>
                </View>
              )}

              {/* Reminder Section */}
              {receipt?.followup_automation && (
                <View style={[styles.receiptRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 12, borderBottomWidth: 0, paddingBottom: 0, justifyContent: 'center' }]}>
                  <Text style={{ color: '#ffd060', fontSize: 13, fontWeight: '600' }}>
                    🔔 Reminder {receipt.followup_automation.trigger_delta.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Contextual Follow-up Action Grid */}
        <Text style={styles.followupHeader}>Actions & Quick Assistance</Text>
        {actionsLoading ? (
          <ActivityIndicator size="small" color="#00D4A8" style={{ marginVertical: 15 }} />
        ) : (
          <View style={styles.actionGrid}>
            {actions.filter(act => act.action !== 'rate_service' || booking?.status === 'completed').map((act, index) => {
              let iconName = "sparkles-outline";
              let btnStyle = styles.actionBtn;
              let txtStyle = styles.actionBtnText;

              if (act.action === 'reminder') { iconName = "alarm-outline"; }
              else if (act.action === 'contact') { iconName = "call-outline"; btnStyle = [styles.actionBtn, styles.actionBtnBlue]; txtStyle = [styles.actionBtnText, styles.actionBtnTextBlue]; }
              else if (act.action === 'rebook' || act.action === 'book_another') { iconName = "add-circle-outline"; }
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
                <View style={{ gap: 12 }}>
                  <TouchableOpacity style={styles.statusConfirmBtn} onPress={handleStartService}>
                    <Ionicons name="play-sharp" size={20} color="#050810" style={{ marginRight: 6 }} />
                    <Text style={styles.statusConfirmBtnText}>Mark as Started</Text>
                  </TouchableOpacity>
                  {/* Cancel only allowed before service starts */}
                  <TouchableOpacity style={styles.cancelBookingBtn} onPress={() => setCancelModalVisible(true)}>
                    <Ionicons name="close-circle-outline" size={20} color="#ff6b6b" style={{ marginRight: 6 }} />
                    <Text style={styles.cancelBookingBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              )}

              {booking?.status === 'in_progress' && (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity style={styles.statusDoneBtn} onPress={handleCompleteService}>
                    <Ionicons name="checkmark-done" size={20} color="#050810" style={{ marginRight: 6 }} />
                    <Text style={styles.statusDoneBtnText}>Mark as Done</Text>
                  </TouchableOpacity>
                  {/* Info: cancel not allowed once started */}
                  <View style={styles.cancelBlockedNote}>
                    <Ionicons name="lock-closed-outline" size={14} color="#5a6a85" style={{ marginRight: 6 }} />
                    <Text style={styles.cancelBlockedNoteText}>Cancellation not allowed once service has started</Text>
                  </View>
                </View>
              )}

              {booking?.status === 'completed' && (
                <View style={styles.completedBadgeRow}>
                  <Ionicons name="checkbox" size={22} color="#00D4A8" />
                  <Text style={styles.completedBadgeText}>Service delivered successfully</Text>
                </View>
              )}

              {booking?.status === 'cancelled' && (
                <View style={styles.cancelledBadgeRow}>
                  <Ionicons name="close-circle" size={22} color="#ff6b6b" />
                  <Text style={styles.cancelledBadgeText}>Booking Cancelled</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Standard Navigation Controls */}
        <View style={styles.bottomNavGroup}>
          <TouchableOpacity 
            style={styles.traceBtn} 
            onPress={() => navigation.navigate('AgentTrace', { session_id: activeSessionId, booking_id: bookingId })}
          >
            <Ionicons name="hardware-chip-outline" size={18} color="#ffd843" style={{ marginRight: 6 }} />
            <Text style={styles.traceBtnText}>See agent reasoning</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CANCEL BOOKING MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackCard}>
            <Ionicons name="close-circle" size={48} color="#ff6b6b" style={{ marginBottom: 12 }} />
            <Text style={styles.feedbackTitle}>Cancel Booking</Text>
            <Text style={styles.feedbackSubtitle}>Please tell us why you want to cancel. This helps us improve our service.</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Provider not responding, scheduling conflict..."
              placeholderTextColor="#3a4a65"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.feedbackModalActions}>
              <TouchableOpacity style={styles.cancelRateBtn} onPress={() => { setCancelModalVisible(false); setCancelReason(''); }}>
                <Text style={styles.cancelRateBtnText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitRateBtn, { backgroundColor: '#ff6b6b' }]}
                onPress={handleCancelBooking}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitRateBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          REVIEW MODAL (Auto after completion)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                <Text style={styles.feedbackSubtitle}>How was the service by {booking?.provider_name || provider?.name}?</Text>
                
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <Ionicons 
                        name={star <= rating ? "star" : "star-outline"} 
                        size={36} 
                        color="#ffd060" 
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.reasonInput, { marginBottom: 16 }]}
                  placeholder="Write your experience (optional)..."
                  placeholderTextColor="#3a4a65"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.feedbackModalActions}>
                  <TouchableOpacity style={styles.cancelRateBtn} onPress={() => setFeedbackVisible(false)}>
                    <Text style={styles.cancelRateBtnText}>Skip</Text>
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

  // Cancel Booking Button
  cancelBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.06)',
    borderColor: 'rgba(255,107,107,0.3)',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%'
  },
  cancelBookingBtnText: { color: '#ff6b6b', fontSize: 15, fontWeight: '700' },

  // Cancellation blocked note
  cancelBlockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  cancelBlockedNoteText: { color: '#5a6a85', fontSize: 12, fontStyle: 'italic' },

  // Cancelled badge
  cancelledBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.06)',
    borderColor: 'rgba(255,107,107,0.2)',
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    width: '100%'
  },
  cancelledBadgeText: { color: '#ff6b6b', fontSize: 15, fontWeight: '700', marginLeft: 8 },

  // Reason text input
  reasonInput: {
    width: '100%',
    backgroundColor: '#0b0f1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#FFF',
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
    minHeight: 100
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 8, 16, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  feedbackCard: { 
    backgroundColor: '#111827', 
    borderRadius: 20, 
    padding: 24, 
    width: '100%', 
    maxWidth: 360, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  feedbackTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  feedbackSubtitle: { color: '#8fa3c0', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  feedbackModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelRateBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1b2336', alignItems: 'center' },
  cancelRateBtnText: { color: '#8fa3c0', fontWeight: 'bold', fontSize: 14 },
  submitRateBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#00D4A8', alignItems: 'center' },
  submitRateBtnText: { color: '#050810', fontWeight: 'bold', fontSize: 14 },
  submittedBox: { padding: 20, alignItems: 'center' },
  submittedText: { color: '#00D4A8', fontSize: 16, fontWeight: 'bold' }
});
