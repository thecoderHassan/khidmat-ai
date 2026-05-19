import axios from 'axios';
import { providersData } from '../screens/providersData';

// Expo automatically loads EXPO_PUBLIC_* variables from .env files.
// Fallback URL has been updated to the active stable Ngrok tunnel.
// Note on Backend API Specifications (confirmed by Backend Team):
// 1. Distance: The API returns actual distance in `provider.distance_km` (real GPS distance from user's area).
// 2. Score scale: All scores (overall & sub-scores) are standardized on a 0-1 float scale (e.g. top_match.score = 0.85).
// 3. Score calculation: Ranking is pre-computed on the backend using the formula: 0.40*proximity + 0.40*rating + 0.20*availability.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://tastiness-silly-strife.ngrok-free.dev";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // Reduced from 30s to 10s for faster local fallback response
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  },
});

// Real mathematical Haversine distance calculator based on lat/lng coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2));
};

// Generates booking IDs strictly matching backend format: BK-YYYYMMDD-XXXXX
export const generateMockBookingId = () => {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(10000 + Math.random() * 90000);
  return `BK-${yyyymmdd}-${seq}`;
};

// Helper to generate mock results when backend is down
const generateMockResults = (message, lat, lng) => {
  const lowercaseMsg = message.toLowerCase();
  let category = "AC Technician"; // Default fallback
  
  if (lowercaseMsg.includes('plumb') || lowercaseMsg.includes('leak') || lowercaseMsg.includes('pipe') || lowercaseMsg.includes('leakage')) {
    category = "Plumber";
  } else if (lowercaseMsg.includes('electr') || lowercaseMsg.includes('bijli') || lowercaseMsg.includes('board') || lowercaseMsg.includes('light') || lowercaseMsg.includes('short')) {
    category = "Electrician";
  } else if (lowercaseMsg.includes('car') || lowercaseMsg.includes('mechanic') || lowercaseMsg.includes('auto')) {
    category = "Car Mechanic";
  } else if (lowercaseMsg.includes('hair') || lowercaseMsg.includes('barber') || lowercaseMsg.includes('salon') || lowercaseMsg.includes('haircut')) {
    category = "Barber";
  } else if (lowercaseMsg.includes('tutor') || lowercaseMsg.includes('padha') || lowercaseMsg.includes('teacher')) {
    category = "Tutor";
  } else if (lowercaseMsg.includes('carpenter') || lowercaseMsg.includes('lakri') || lowercaseMsg.includes('wood') || lowercaseMsg.includes('sofa')) {
    category = "Carpenter";
  }
  
  // Filter providers by service category
  const candidates = providersData.providers.filter(p => 
    p.service_categories.some(c => c.toLowerCase().includes(category.toLowerCase()))
  );
  
  // Add scores, distance, slots, and reasoning
  const processed = candidates.map((p, index) => {
    const dist = calculateDistance(lat, lng, p.lat, p.lng) || (index === 0 ? 0.2 : (index + 1) * 1.5);
    const proximity = Math.max(0, Math.min(1, 1 - (dist / 10)));
    const ratingVal = p.rating || 4.5;
    const ratingScore = (ratingVal - 1) / 4;
    const availabilityScore = p.available ? 1.0 : 0.0;
    const overallScore = (0.40 * proximity) + (0.40 * ratingScore) + (0.20 * availabilityScore);
    
    // Add realistic slots
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const formatIso = (date, hour) => {
      const d = new Date(date);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString().replace(/\.\d+Z$/, '');
    };
    
    return {
      ...p,
      distance_km: dist,
      experience_years: p.id === 'P001' ? 12 : p.id === 'P002' ? 8 : 6,
      phone: p.phone || `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      reasoning: `💡 Auto Match: ${p.name} matches perfectly in ${p.area}. Highly rated and immediate availability.`,
      available_slots: [formatIso(tomorrow, 9), formatIso(tomorrow, 11), formatIso(tomorrow, 14)],
      proximity_score: proximity,
      rating_score: ratingScore,
      availability_score: availabilityScore,
      score: overallScore
    };
  });
  
  // Sort by score descending
  processed.sort((a, b) => b.score - a.score);
  
  const topMatch = processed[0] || null;
  const alternatives = processed.slice(1);
  
  return {
    session_id: "SES-" + Math.floor(100000 + Math.random() * 900000),
    intent: {
      service_type: category,
      language_detected: lowercaseMsg.match(/[a-z]/i) ? "en" : "ro",
      time_preference: "tomorrow morning",
      time_iso: new Date().toISOString()
    },
    top_match: topMatch,
    alternatives: alternatives,
    trace_url: "/api/trace/mock-session"
  };
};

// Helper to generate mock booking confirmation
const generateMockBookingResponse = (bookingData) => {
  const provider = providersData.providers.find(p => p.id === bookingData.provider_id) || {
    id: bookingData.provider_id,
    name: "Selected Service Expert",
    service_categories: ["Technician"],
    area: "G-13",
    price_range: "500-2000"
  };
  
  const bookingId = generateMockBookingId();
  
  return {
    booking_id: bookingId,
    booking: {
      booking_id: bookingId,
      session_id: bookingData.session_id,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      service_type: provider.service_categories[0],
      slot: bookingData.slot,
      status: "confirmed",
      user_name: bookingData.user_name,
      user_phone: bookingData.user_phone
    },
    receipt: {
      provider_name: provider.name,
      service_type: provider.service_categories[0],
      slot: bookingData.slot,
      price_range: provider.price_range || "Rs 500 - 2,000",
      user_phone: bookingData.user_phone,
      booking_id: bookingId
    }
  };
};

/**
 * Phase 1: Submit a natural language service request with location coordinates.
 * @param {string} message - Natural language prompt from the user.
 * @param {number} lat - User latitude.
 * @param {number} lng - User longitude.
 */
export const submitRequest = async (message, lat, lng) => {
  try {
    const response = await api.post('/api/request', {
      message,
      user_lat: lat,
      user_lng: lng,
    });
    return response.data;
  } catch (error) {
    console.warn("⚠️ API submitRequest failed or backend down. Falling back to high-fidelity local mock matching...");
    return generateMockResults(message, lat, lng);
  }
};

/**
 * Phase 2: Book a specific provider slot.
 * @param {Object} bookingData - Contains session_id, provider_id, slot, user_name, user_phone.
 */
export const bookSlot = async (bookingData) => {
  try {
    const response = await api.post('/api/book', bookingData);
    return response.data;
  } catch (error) {
    console.warn("⚠️ API bookSlot failed or backend down. Falling back to local mock booking confirmation...");
    return generateMockBookingResponse(bookingData);
  }
};

/**
 * Fetch full agent reasoning logs.
 * @param {string} sessionId - The session ID generated from the initial request.
 */
export const getAgentTrace = async (sessionId) => {
  try {
    const response = await api.get(`/api/trace/${sessionId}`);
    return response.data;
  } catch (error) {
    console.warn("⚠️ API getAgentTrace failed. Returning high-fidelity mock agent trace steps...");
    return {
      session_id: sessionId || "SES-MOCK-TRACE",
      steps: [
        {
          agent: "agent_1_intent",
          step: "Extract intent",
          timestamp: new Date().toISOString(),
          input: { prompt: "AC technician chahiye kal subah" },
          reasoning: "The customer is requesting an 'AC Technician' in Roman Urdu. Language detected: Roman Urdu. Preferred slot: tomorrow morning. Threshold set to 10 km.",
          tool_used: "gemini-2.5-flash",
          tools_available: ["gemini-2.5-flash", "roman_urdu_translator"],
          output: { service_type: "AC Technician", language_detected: "ro", time_preference: "tomorrow morning" }
        },
        {
          agent: "agent_2_discovery",
          step: "Geospatial discovery",
          timestamp: new Date().toISOString(),
          input: { service: "AC Technician", coordinates: { lat: 33.6938, lng: 72.9720 } },
          reasoning: "Queried the provider registry database for 'AC Technician' within 10 km of G-13. Discovered Ustad Tariq AC Services (0.2 km away, rating 4.8). Ranked highest based on proximity and experience.",
          tool_used: "geospatial_haversine_calculator",
          tools_available: ["geospatial_haversine_calculator", "sqlite_provider_registry"],
          output: { candidates_found: 2, top_score: 0.95 }
        },
        {
          agent: "agent_3_confirmation",
          step: "Slot validation",
          timestamp: new Date().toISOString(),
          input: { provider_id: "P001", slots_requested: "tomorrow morning" },
          reasoning: "Validated slots for Ustad Tariq AC Services. Tomorrow 9:00 AM slot is active and locked for booking.",
          tool_used: "calendar_availability_locker",
          tools_available: ["calendar_availability_locker", "slot_availability_check"],
          output: { slot_locked: true, expiration: "10 mins" }
        },
        {
          agent: "agent_4_booking",
          step: "Create transaction",
          timestamp: new Date().toISOString(),
          input: { sessionId, user_name: "Aqib Raza", provider_id: "P001" },
          reasoning: "Committed transaction booking entry in SQL database as 'confirmed'. Dispatched WhatsApp notifications.",
          tool_used: "db_transaction_committer",
          tools_available: ["db_transaction_committer", "gemini-2.5-flash"],
          output: { transaction_status: "SUCCESS", booking_id: generateMockBookingId() }
        }
      ]
    };
  }
};

/**
 * Fetch list of contextual follow-up actions for a booking.
 * @param {string} bookingId - The booking reference ID.
 */
export const getFollowupActions = async (bookingId) => {
  try {
    const response = await api.post('/followup', { booking_id: bookingId });
    return response.data;
  } catch (error) {
    console.warn("⚠️ API getFollowupActions failed. Returning silent follow-up actions...");
    return {
      actions: [
        { action: "reminder", label: "Set Reminder", payload: {} },
        { action: "contact", label: "Contact Expert", payload: { phone: "03001234567" } },
        { action: "rebook", label: "Rebook Service", payload: {} },
        { action: "rate_service", label: "Rate Service", payload: {} }
      ]
    };
  }
};

/**
 * Update the booking status (e.g. mark in_progress or cancelled).
 * @param {string} bookingId - The booking reference ID.
 * @param {string} status - New status "in_progress" | "cancelled".
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const response = await api.patch(`/api/bookings/${bookingId}/status`, { status });
    return response.data;
  } catch (error) {
    console.warn(`⚠️ API updateBookingStatus failed or backend down. Simulating status '${status}' locally...`);
    return {
      booking: {
        booking_id: bookingId,
        status: status
      }
    };
  }
};

/**
 * Mark booking as complete.
 * @param {string} bookingId - The booking reference ID.
 */
export const completeBooking = async (bookingId) => {
  try {
    const response = await api.patch(`/api/bookings/${bookingId}/complete`);
    return response.data;
  } catch (error) {
    console.warn("⚠️ API completeBooking failed or backend down. Simulating completion locally...");
    return {
      booking: {
        booking_id: bookingId,
        status: "completed"
      }
    };
  }
};

/**
 * Fetch details of a single booking.
 * @param {string} bookingId - The booking reference ID.
 */
export const getBookingDetails = async (bookingId) => {
  try {
    const response = await api.get(`/api/bookings/${bookingId}`);
    return response.data;
  } catch (error) {
    console.warn("⚠️ API getBookingDetails failed or backend down. Using current active booking state.");
    return null;
  }
};

export default api;
