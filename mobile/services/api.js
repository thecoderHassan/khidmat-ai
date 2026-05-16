import axios from "axios";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

/**
 * Submit a natural language service request.
 * @param {string} message - User input in Urdu/Roman Urdu/English
 */
export const submitRequest = (message) =>
  api.post("/api/request", { message }).then((r) => r.data);

/**
 * Get booking by ID.
 */
export const getBooking = (bookingId) =>
  api.get(`/api/booking/${bookingId}`).then((r) => r.data);

/**
 * List all mock providers.
 */
export const getProviders = () =>
  api.get("/api/providers").then((r) => r.data);

/**
 * Filter providers by service category.
 */
export const getProvidersByCategory = (category) =>
  api.get(`/api/providers/${encodeURIComponent(category)}`).then((r) => r.data);

export default api;
