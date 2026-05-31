import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, format } from 'date-fns';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { bookSlot } from '../services/api';

const LANGUAGE_MAP = {
  ur: "اردو Urdu",
  ro: "Roman Urdu",
  en: "English"
};

// Fix #6: Pakistan city traffic ~25 km/h realistic estimate
const CITY_SPEED_KMH = 25;

export default function ProviderResultsScreen({ navigation, route }) {
  const { results, request, user_lat, user_lng } = route.params || {};
  const { session_id, intent, top_match, alternatives = [] } = results || {};

  const scrollViewRef = useRef(null);
  const mapRef = useRef(null);
  const cardRefs = useRef({});

  // Fix #5: Single source of truth — activeRouteProvider drives both highlight + route
  const [activeRouteProvider, setActiveRouteProvider] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState({});
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingProvider, setBookingProvider] = useState(null);

  // Fix #4: Empty defaults so user fills their own info
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fix #7: Map height expands when route is active
  const mapHeight = activeRouteProvider ? 300 : 220;

  const serviceType = intent?.service_type || "Service Expert";
  const rawTimeIso = intent?.time_iso;
  const timeLabel = rawTimeIso
    ? format(parseISO(rawTimeIso), "eee, MMM d 'at' h:mm a")
    : (intent?.time_preference || "As soon as possible");
  const langLabel = LANGUAGE_MAP[intent?.language_detected] || "Auto-detected";

  const validAlternatives = (alternatives || []).filter(item => item !== null);
  const displayProviders = expanded ? validAlternatives : [];

  // ─────────────────────────────────────────────
  // Fix #1: Haversine — returns km, walk, drive
  // ─────────────────────────────────────────────
  const calcDistanceInfo = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return { km: null, driveMins: null, walkMins: null };
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const km = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
    return {
      km,
      driveMins: Math.round((km / CITY_SPEED_KMH) * 60),  // Fix #6: realistic city speed
      walkMins: Math.round((km / 5) * 60),                 // Fix #1: walk shown in banner
    };
  };

  // ─────────────────────────────────────────────
  // Fix #2: Reliable scroll using y offset accumulation
  // ─────────────────────────────────────────────
  const cardYOffsets = useRef({});

  const handleMarkerPress = (provider) => {
    // Fix #5: sync both states together
    setActiveRouteProvider(provider);
    if (provider.id !== top_match?.id && !expanded) {
      setExpanded(true);
      setTimeout(() => scrollToCard(provider.id), 450);
    } else {
      scrollToCard(provider.id);
    }
  };

  const scrollToCard = (providerId) => {
    const y = cardYOffsets.current[providerId];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: y - 16, animated: true });
    }
  };

  // ─────────────────────────────────────────────
  // View on Map — route line + fit both pins
  // ─────────────────────────────────────────────
  const handleViewOnMap = (provider) => {
    // Navigate to fullscreen map screen
    navigation.navigate('ProviderMap', {
      provider,
      user_lat,
      user_lng,
    });
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Dialer Error", "Could not open dialer app."));
  };

  const initiateBooking = (provider) => {
    if (!selectedSlots[provider.id]) {
      Alert.alert("Time Slot Required", `Please select an available slot for ${provider.name} before booking.`);
      return;
    }
    // Fix #3: always reset booking form when opening modal
    setUserName('');
    setUserPhone('');
    setBookingProvider(provider);
    setBookingModalVisible(true);
  };

  // Fix #9: phone number validation
  const isValidPhone = (phone) => /^03[0-9]{9}$/.test(phone.trim());

  const handleConfirmBooking = async () => {
    if (!userName.trim()) {
      Alert.alert("Name Required", "Please enter your name.");
      return;
    }
    // Fix #9: validate Pakistani phone format
    if (!isValidPhone(userPhone)) {
      Alert.alert("Invalid Phone", "Please enter a valid Pakistani number (e.g. 03001234567).");
      return;
    }
    setBookingLoading(true);
    try {
      const payload = {
        session_id,
        provider_id: bookingProvider.id,
        slot: selectedSlots[bookingProvider.id],
        user_name: userName.trim(),
        user_phone: userPhone.trim(),
      };
      const response = await bookSlot(payload);
      setBookingModalVisible(false);
      // Fix #3: clear stale state after successful booking
      setBookingProvider(null);
      navigation.navigate('BookingConfirm', {
        bookingResponse: response,
        booking: response?.booking,
        receipt: response?.receipt,
        bookingId: response?.booking?.booking_id || response?.booking_id,
        provider: bookingProvider,
        session_id,
      });
    } catch (error) {
      const errMsg = error?.response?.status === 409
        ? "This slot has already been booked. Please select a different slot."
        : (error?.response?.data?.message || error.message || "An unexpected booking error occurred.");
      Alert.alert("Booking Failed", errMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  const formatSlot = (isoString) => {
    try { return format(parseISO(isoString), "eee h:mm a"); }
    catch (e) { return isoString; }
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
            <Text style={styles.scoreBarVal}>{s.val.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderProviderCard = (provider, isBestMatch) => {
    // Fix #5: single state for both highlight and route
    const isRouteActive = activeRouteProvider?.id === provider.id;
    const scoreVal = provider.score ? provider.score.toFixed(2) : "0.00";
    const initials = provider.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    const slots = provider.available_slots || [];
    const activeSelectedSlot = selectedSlots[provider.id];
    const { km: dist, driveMins } = calcDistanceInfo(user_lat, user_lng, provider.lat, provider.lng);
    const displayDist = provider.distance_km || dist;
    const displayDrive = provider.distance_km
      ? Math.round((provider.distance_km / CITY_SPEED_KMH) * 60)
      : driveMins;

    return (
      <View
        key={provider.id}
        // Fix #2: capture y offset reliably via onLayout
        onLayout={(e) => { cardYOffsets.current[provider.id] = e.nativeEvent.layout.y; }}
        style={[
          styles.card,
          isBestMatch && styles.bestMatchCard,
          isRouteActive && styles.cardHighlighted,
        ]}
      >
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

        {/* Categories & Pills */}
        <View style={styles.detailsBlock}>
          <Text style={styles.categoryText}>{provider.service_categories.join(', ')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <Ionicons name="location-sharp" size={12} color="#e4eaf8" />
              <Text style={styles.infoPillText}>{provider.area}{displayDist ? ` · ${displayDist} km` : ''}</Text>
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

        {/* Reasoning */}
        {provider.reasoning && (
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningText}>
              <Ionicons name="bulb-outline" size={13} color="#ffd843" />{' '}
              <Text style={{ fontStyle: 'italic' }}>{provider.reasoning}</Text>
            </Text>
          </View>
        )}

        {/* Score Bars */}
        {renderScoreBars(provider)}

        {/* Slots */}
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

        {/* View on Map Button */}
        {provider.lat && provider.lng && (
          <TouchableOpacity
            style={[styles.viewOnMapBtn, isRouteActive && styles.viewOnMapBtnActive]}
            onPress={() => handleViewOnMap(provider)}
          >
            <Ionicons
              name='map-outline'
              size={15}
              color='#00D4A8'
              style={{ marginRight: 7 }}
            />
            <Text style={styles.viewOnMapBtnText}>
              {`View on Map${displayDist ? '  ·  ' + displayDist + ' km' + (displayDrive ? '  ·  ~' + displayDrive + ' min' : '') : ''}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(provider.phone || '03001234567')}>
            <Ionicons name="call" size={16} color="#3b9eff" style={{ marginRight: 6 }} />
            <Text style={styles.callBtnText}>Call Expert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookBtn, (!provider.available || slots.length === 0) && styles.disabledBtn]}
            disabled={!provider.available || slots.length === 0}
            onPress={() => initiateBooking(provider)}
          >
            <Text style={styles.bookBtnText}>{provider.available ? 'Book Service' : 'Currently Busy'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!top_match) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Fix #10: Back button on empty state */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={80} color="#ff4a4a" />
          <Text style={styles.emptyTitle}>No Matching Experts</Text>
          <Text style={styles.emptyText}>No service providers were found for "{serviceType}". Try adjusting your prompt.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.emptyBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Route distance info for banner
  const routeInfo = activeRouteProvider
    ? calcDistanceInfo(user_lat, user_lng, activeRouteProvider.lat, activeRouteProvider.lng)
    : {};
  const routeDist = activeRouteProvider?.distance_km || routeInfo.km;
  const routeDriveMins = activeRouteProvider?.distance_km
    ? Math.round((activeRouteProvider.distance_km / CITY_SPEED_KMH) * 60)
    : routeInfo.driveMins;
  // Fix #1: walk mins now actually used in banner
  const routeWalkMins = routeInfo.walkMins;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Fix #10: Back button header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Matching Experts</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Intent Bar */}
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

        {/* ── MAP SECTION — Fix #7: dynamic height ── */}
        <View style={[styles.mapContainerWrapper, { height: mapHeight }]}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.resultsMap}
            initialRegion={{
              latitude: user_lat || 33.6938,
              longitude: user_lng || 72.9720,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {/* User marker */}
            <Marker coordinate={{ latitude: user_lat || 33.6938, longitude: user_lng || 72.9720 }} title="Your Location">
              <View style={styles.userMarker}>
                <Ionicons name="person" size={16} color="#FFF" />
              </View>
            </Marker>

            {/* Top match marker */}
            {top_match?.lat && top_match?.lng && (
              <Marker
                coordinate={{ latitude: top_match.lat, longitude: top_match.lng }}
                title={top_match.name}
                description="Top Match"
                onPress={() => handleMarkerPress(top_match)}
              >
                <View style={[styles.topMatchMarker, activeRouteProvider?.id === top_match.id && styles.markerHighlighted]}>
                  <Ionicons name="star" size={12} color="#050810" />
                </View>
              </Marker>
            )}

            {/* Alternative markers */}
            {validAlternatives.map(provider => {
              if (!provider.lat || !provider.lng) return null;
              return (
                <Marker
                  key={provider.id}
                  coordinate={{ latitude: provider.lat, longitude: provider.lng }}
                  title={provider.name}
                  description={provider.service_categories.join(', ')}
                  onPress={() => handleMarkerPress(provider)}
                >
                  <View style={[styles.altMarker, activeRouteProvider?.id === provider.id && styles.markerHighlighted]}>
                    <Text style={styles.altMarkerText}>{provider.rating ? provider.rating.toFixed(1) : ''}</Text>
                  </View>
                </Marker>
              );
            })}

            {/* Dashed route line */}
            {activeRouteProvider?.lat && activeRouteProvider?.lng && user_lat && user_lng && (
              <Polyline
                coordinates={[
                  { latitude: user_lat, longitude: user_lng },
                  { latitude: activeRouteProvider.lat, longitude: activeRouteProvider.lng },
                ]}
                strokeColor="#3b9eff"
                strokeWidth={2.5}
                lineDashPattern={[8, 5]}
              />
            )}
          </MapView>

          {/* Distance Banner — Fix #1: walk mins now shown */}
          {activeRouteProvider && (
            <View style={styles.distanceBanner}>
              <View style={styles.distanceBannerLeft}>
                <Ionicons name="navigate" size={15} color="#3b9eff" />
                <Text style={styles.distanceBannerName} numberOfLines={1}>
                  {activeRouteProvider.name}
                </Text>
              </View>
              <View style={styles.distanceBannerRight}>
                {routeDist && (
                  <View style={styles.distancePill}>
                    <Ionicons name="location" size={11} color="#00D4A8" />
                    <Text style={styles.distancePillText}>{routeDist} km</Text>
                  </View>
                )}
                {routeDriveMins && (
                  <View style={[styles.distancePill, { backgroundColor: 'rgba(59,158,255,0.13)' }]}>
                    <Ionicons name="car" size={11} color="#3b9eff" />
                    <Text style={[styles.distancePillText, { color: '#3b9eff' }]}>~{routeDriveMins} min</Text>
                  </View>
                )}
                {routeWalkMins && routeWalkMins <= 60 && (
                  <View style={[styles.distancePill, { backgroundColor: 'rgba(255,208,96,0.13)' }]}>
                    <Ionicons name="walk" size={11} color="#ffd060" />
                    <Text style={[styles.distancePillText, { color: '#ffd060' }]}>~{routeWalkMins} min</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Map Legend */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b9eff' }]} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ffd843' }]} />
              <Text style={styles.legendText}>Best Match</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00D4A8' }]} />
              <Text style={styles.legendText}>Others</Text>
            </View>
          </View>
        </View>

        {/* Top Match */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Top Matches Recommended</Text>
        </View>
        {renderProviderCard(top_match, true)}

        {/* Alternatives */}
        {validAlternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            {!expanded ? (
              <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(true)}>
                <Text style={styles.expandBtnText}>Show {validAlternatives.length} more options</Text>
                <Ionicons name="chevron-down" size={18} color="#00D4A8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Alternative Providers</Text>
                </View>
                {displayProviders.map(provider => renderProviderCard(provider, false))}
                <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(false)}>
                  <Text style={styles.expandBtnText}>Collapse options</Text>
                  <Ionicons name="chevron-up" size={18} color="#00D4A8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* Agent Trace FAB */}
      <TouchableOpacity style={styles.traceFab} onPress={() => navigation.navigate('AgentTrace', { session_id })}>
        <Ionicons name="hardware-chip" size={24} color="#050810" />
        <Text style={styles.traceFabText}>Agent Trace</Text>
      </TouchableOpacity>

      {/* Booking Modal */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setBookingModalVisible(false);
          // Fix #3: clear on dismiss too
          setBookingProvider(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <TouchableOpacity
                onPress={() => { setBookingModalVisible(false); setBookingProvider(null); }}
                disabled={bookingLoading}
              >
                <Ionicons name="close" size={24} color="#8fa3c0" />
              </TouchableOpacity>
            </View>
            {bookingProvider && (
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.modalSummaryBox}>
                  <Text style={styles.summaryLabel}>Provider</Text>
                  <Text style={styles.summaryValue}>{bookingProvider.name}</Text>
                  <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Category</Text>
                  <Text style={styles.summaryValue}>{bookingProvider.service_categories.join(', ')}</Text>
                  <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Selected Time</Text>
                  <Text style={styles.summaryValueSelected}>{formatSlot(selectedSlots[bookingProvider.id])}</Text>
                </View>

                {/* Fix #4: Empty placeholders, user must fill */}
                <Text style={styles.inputLabel}>Your Name <Text style={{ color: '#ff6b6b' }}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#5a6a85"
                  value={userName}
                  onChangeText={setUserName}
                  editable={!bookingLoading}
                  autoCapitalize="words"
                />

                {/* Fix #9: Phone hint + validation */}
                <Text style={styles.inputLabel}>Phone Number <Text style={{ color: '#ff6b6b' }}>*</Text></Text>
                <TextInput
                  style={[
                    styles.formInput,
                    userPhone.length > 0 && !isValidPhone(userPhone) && styles.formInputError
                  ]}
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#5a6a85"
                  keyboardType="phone-pad"
                  maxLength={11}
                  value={userPhone}
                  onChangeText={setUserPhone}
                  editable={!bookingLoading}
                />
                {userPhone.length > 0 && !isValidPhone(userPhone) && (
                  <Text style={styles.inputError}>Format: 03XXXXXXXXX (11 digits)</Text>
                )}

                <TouchableOpacity
                  style={[styles.confirmBookBtn, bookingLoading && styles.confirmBookBtnDisabled]}
                  onPress={handleConfirmBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? <ActivityIndicator size="small" color="#050810" /> : (
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

// Dark map style for OpenStreetMap-based tiles (works with PROVIDER_DEFAULT)
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0b0f1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8fa3c0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050810' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1b2336' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Fix #10: screen header with back button
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },

  intentInfoCard: { backgroundColor: '#0b0f1a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  intentLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  intentLabel: { color: '#8fa3c0', fontSize: 14, flex: 1 },
  intentSubPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161f30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniTagText: { color: '#8fa3c0', fontSize: 11, fontWeight: '500' },

  // Fix #7: height is dynamic via inline style
  mapContainerWrapper: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  resultsMap: { width: '100%', height: '100%' },
  userMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b9eff', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#fff' },
  topMatchMarker: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#ffd843', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#050810' },
  altMarker: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#00D4A8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#050810' },
  altMarkerText: { fontSize: 8, fontWeight: '900', color: '#050810' },
  markerHighlighted: { transform: [{ scale: 1.4 }], borderColor: '#fff', borderWidth: 2.5 },

  distanceBanner: {
    position: 'absolute', top: 10, left: 10, right: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(5,8,16,0.9)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(59,158,255,0.4)',
  },
  distanceBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  distanceBannerName: { color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 7, flex: 1 },
  distanceBannerRight: { flexDirection: 'row', gap: 5 },
  distancePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,212,168,0.13)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  distancePillText: { color: '#00D4A8', fontSize: 10, fontWeight: '700' },

  mapLegend: { position: 'absolute', bottom: 8, left: 10, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(5,8,16,0.75)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#e4eaf8', fontSize: 10, fontWeight: '600' },

  sectionHeader: { marginVertical: 14, paddingLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#8fa3c0', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#111827', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', elevation: 4 },
  bestMatchCard: { borderColor: '#00D4A8', borderWidth: 1.5, backgroundColor: '#0d1d26' },
  cardHighlighted: { borderColor: '#3b9eff', borderWidth: 2, backgroundColor: '#0b1525' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59,158,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(59,158,255,0.3)' },
  avatarText: { color: '#3b9eff', fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase' },
  headerInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1, marginRight: 8 },
  scoreBadge: { backgroundColor: 'rgba(0,212,168,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,212,168,0.25)' },
  scoreBadgeText: { color: '#00D4A8', fontSize: 12, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bestMatchBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffd843', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bestMatchBadgeText: { color: '#050810', fontSize: 9, fontWeight: '900' },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusOnline: { backgroundColor: 'rgba(0,212,168,0.1)' },
  statusOffline: { backgroundColor: 'rgba(255,74,74,0.1)' },
  statusTagText: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  detailsBlock: { marginBottom: 14 },
  categoryText: { color: '#00D4A8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b2336', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoPillText: { color: '#e4eaf8', fontSize: 11, marginLeft: 4, fontWeight: '500' },

  reasoningCard: { backgroundColor: 'rgba(255,216,67,0.05)', borderLeftWidth: 3, borderLeftColor: '#ffd843', padding: 10, borderRadius: 6, marginBottom: 14 },
  reasoningText: { color: '#e4eaf8', fontSize: 12, lineHeight: 18 },

  scoreBarsSection: { marginVertical: 10, backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10 },
  scoreBarRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  scoreBarLabel: { color: '#8fa3c0', fontSize: 10, width: 75, fontWeight: '500' },
  scoreBarBg: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreBarVal: { color: '#FFF', fontSize: 10, fontWeight: '600', width: 20, textAlign: 'right' },

  slotsSection: { marginVertical: 12 },
  slotsTitle: { color: '#8fa3c0', fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  slotsScroll: { gap: 8, paddingVertical: 2 },
  slotPill: { backgroundColor: '#1b2336', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  slotPillSelected: { backgroundColor: 'rgba(0,212,168,0.1)', borderColor: '#00D4A8' },
  slotText: { color: '#8fa3c0', fontSize: 12, fontWeight: '600' },
  slotTextSelected: { color: '#00D4A8' },
  noSlotsText: { color: '#ff4a4a', fontSize: 11, fontWeight: '600', marginVertical: 10 },

  viewOnMapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,212,168,0.07)', borderWidth: 1, borderColor: 'rgba(0,212,168,0.25)', borderRadius: 10, paddingVertical: 10, marginBottom: 12 },
  viewOnMapBtnActive: { backgroundColor: '#3b9eff', borderColor: '#3b9eff' },
  viewOnMapBtnText: { color: '#00D4A8', fontSize: 12, fontWeight: '700' },
  viewOnMapBtnTextActive: { color: '#fff' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  callBtn: { flexDirection: 'row', flex: 1, backgroundColor: 'rgba(59,158,255,0.08)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59,158,255,0.25)' },
  callBtnText: { color: '#3b9eff', fontWeight: 'bold', fontSize: 13 },
  bookBtn: { flex: 1.4, backgroundColor: '#00D4A8', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#3a4a65', opacity: 0.5 },
  bookBtnText: { color: '#050810', fontWeight: '800', fontSize: 14 },

  alternativesSection: { marginTop: 10 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f1a', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,212,168,0.15)', marginVertical: 10 },
  expandBtnText: { color: '#00D4A8', fontSize: 14, fontWeight: 'bold' },

  traceFab: { position: 'absolute', bottom: 24, right: 24, flexDirection: 'row', backgroundColor: '#ffd843', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  traceFabText: { color: '#050810', fontWeight: '850', fontSize: 14, marginLeft: 6 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#8fa3c0', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#00D4A8', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  emptyBtnText: { color: '#050810', fontWeight: 'bold', fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(5,8,16,0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  modalScroll: { marginBottom: 10 },
  modalSummaryBox: { backgroundColor: '#0b0f1a', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 20 },
  summaryLabel: { color: '#5a6a85', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#FFF', fontSize: 15, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  summaryValueSelected: { color: '#00D4A8', fontSize: 15, fontWeight: '750', marginTop: 2 },
  inputLabel: { color: '#8fa3c0', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  formInput: { backgroundColor: '#0b0f1a', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 12, color: '#FFF', paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 6 },
  formInputError: { borderColor: '#ff6b6b', borderWidth: 1.5 },
  inputError: { color: '#ff6b6b', fontSize: 11, marginBottom: 14, marginLeft: 4 },
  confirmBookBtn: { flexDirection: 'row', backgroundColor: '#00D4A8', paddingVertical: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 14, marginBottom: 20 },
  confirmBookBtnDisabled: { backgroundColor: '#3a4a65', opacity: 0.7 },
  confirmBookBtnText: { color: '#050810', fontSize: 16, fontWeight: '850' },
});
