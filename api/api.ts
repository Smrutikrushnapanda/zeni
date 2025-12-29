// services/api.service.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: Change this to your computer's IP address
// Find it: Windows (ipconfig), Mac (ifconfig), Linux (ip addr)
const API_URL = "https://zeni-backend.up.railway.app"; 


const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout");
    } else if (error.code === "ERR_NETWORK") {
      console.error("🌐 Network error - Check if backend is running");
    } else {
      console.error("❌ API Error:", error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// ========================================
// API FUNCTIONS
// ========================================

/**
 * Send a chat message to AI
 */
export const sendChatMessage = async (message: string, sessionId?: string) => {
  try {
    const response = await api.post("/chat", {
      message,
      sessionId: sessionId || await getOrCreateSessionId(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to send message");
  }
};

/**
 * Clear conversation history
 */
export const clearConversation = async (sessionId?: string) => {
  try {
    const id = sessionId || await getOrCreateSessionId();
    const response = await api.delete(`/conversation/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to clear conversation");
  }
};

/**
 * Get conversation history
 */
export const getConversation = async (sessionId?: string) => {
  try {
    const id = sessionId || await getOrCreateSessionId();
    const response = await api.get(`/conversation/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to get conversation");
  }
};

/**
 * Health check
 */
export const healthCheck = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error: any) {
    throw new Error("Backend is not reachable");
  }
};

// ========================================
// SESSION MANAGEMENT
// ========================================

const SESSION_KEY = "zeni_session_id";

/**
 * Get or create a unique session ID for this device
 */
export const getOrCreateSessionId = async (): Promise<string> => {
  try {
    let sessionId = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem(SESSION_KEY, sessionId);
      console.log("🆔 Created new session:", sessionId);
    }
    return sessionId;
  } catch (error) {
    console.error("Error managing session:", error);
    return `session_${Date.now()}`;
  }
};

/**
 * Clear session (for logout)
 */
export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
  console.log("🗑️ Session cleared");
};

export default api;