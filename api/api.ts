// services/api.service.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: Change this to your computer's IP address
// Find it: Windows (ipconfig), Mac (ifconfig), Linux (ip addr)
const API_URL = "https://zeni-backend-xceb.onrender.com"; 

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
    // 🔍 ADD THESE DEBUG LOGS
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`🌐 BASE URL: ${config.baseURL}`);
    console.log(`🔗 FULL URL: ${config.baseURL}${config.url}`);
    console.log(`📦 DATA:`, config.data);
    // END DEBUG LOGS
    
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
    console.log(`📥 ${response.status} ${response.config.url}`);
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
// TYPES
// ========================================

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserChatsData {
  chats: Chat[];
  activeChat: string | null;
}

// ========================================
// SESSION MANAGEMENT
// ========================================

const SESSION_KEY = "zeni_session_id";
const USER_ID_KEY = "zeni_user_id";

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
 * Get or create a unique user ID for this device
 */
export const getOrCreateUserId = async (): Promise<string> => {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      console.log("👤 Created new user ID:", userId);
    }
    return userId;
  } catch (error) {
    console.error("Error managing user ID:", error);
    return `user_${Date.now()}`;
  }
};

/**
 * Clear session (for logout)
 */
export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
  console.log("🗑️ Session cleared");
};

/**
 * Clear user ID (complete reset)
 */
export const clearUserId = async () => {
  await AsyncStorage.removeItem(USER_ID_KEY);
  console.log("🗑️ User ID cleared");
};

// ========================================
// AI CHAT API FUNCTIONS
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
// CHAT STORAGE API FUNCTIONS
// ========================================

/**
 * Get all chats for the current user
 */
export const getAllChats = async (): Promise<UserChatsData> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.get(`/chats/${userId}`);
    
    if (response.data.success) {
      console.log("✅ Retrieved chats from server:", response.data.data);
      return response.data.data;
    } else {
      throw new Error(response.data.error || "Failed to retrieve chats");
    }
  } catch (error: any) {
    console.error("❌ Error fetching chats:", error);
    throw new Error(error.response?.data?.error || "Failed to retrieve chats");
  }
};

/**
 * Create a new chat
 */
export const createChat = async (
  id: string,
  title: string = "New Chat"
): Promise<Chat> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.post(`/chats/${userId}/chats`, {
      id,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
    });
    
    if (response.data.success) {
      console.log("✅ Created chat:", response.data.data);
      return response.data.data;
    } else {
      throw new Error(response.data.error || "Failed to create chat");
    }
  } catch (error: any) {
    console.error("❌ Error creating chat:", error);
    throw new Error(error.response?.data?.error || "Failed to create chat");
  }
};

/**
 * Update chat (title or messages)
 */
export const updateChat = async (
  chatId: string,
  updates: { title?: string; messages?: ChatMessage[] }
): Promise<Chat> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.put(`/chats/${userId}/chats/${chatId}`, updates);
    
    if (response.data.success) {
      console.log("✅ Updated chat:", response.data.data);
      return response.data.data;
    } else {
      throw new Error(response.data.error || "Failed to update chat");
    }
  } catch (error: any) {
    console.error("❌ Error updating chat:", error);
    throw new Error(error.response?.data?.error || "Failed to update chat");
  }
};

/**
 * Delete a chat
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.delete(`/chats/${userId}/chats/${chatId}`);
    
    if (response.data.success) {
      console.log("✅ Deleted chat:", chatId);
    } else {
      throw new Error(response.data.error || "Failed to delete chat");
    }
  } catch (error: any) {
    console.error("❌ Error deleting chat:", error);
    throw new Error(error.response?.data?.error || "Failed to delete chat");
  }
};

/**
 * Clear all chats
 */
export const clearAllChats = async (): Promise<void> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.delete(`/chats/${userId}/chats`);
    
    if (response.data.success) {
      console.log("✅ Cleared all chats");
    } else {
      throw new Error(response.data.error || "Failed to clear chats");
    }
  } catch (error: any) {
    console.error("❌ Error clearing chats:", error);
    throw new Error(error.response?.data?.error || "Failed to clear chats");
  }
};

/**
 * Set active chat
 */
export const setActiveChat = async (chatId: string | null): Promise<void> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.put(`/chats/${userId}/active-chat`, { chatId });
    
    if (response.data.success) {
      console.log("✅ Set active chat:", chatId);
    } else {
      throw new Error(response.data.error || "Failed to set active chat");
    }
  } catch (error: any) {
    console.error("❌ Error setting active chat:", error);
    throw new Error(error.response?.data?.error || "Failed to set active chat");
  }
};

/**
 * Add message to chat
 */
export const addMessageToChat = async (
  chatId: string,
  message: Omit<ChatMessage, "id">
): Promise<ChatMessage> => {
  try {
    const userId = await getOrCreateUserId();
    const response = await api.post(
      `/chats/${userId}/chats/${chatId}/messages`,
      { message }
    );
    
    if (response.data.success) {
      console.log("✅ Added message to chat");
      return response.data.data;
    } else {
      throw new Error(response.data.error || "Failed to add message");
    }
  } catch (error: any) {
    console.error("❌ Error adding message:", error);
    throw new Error(error.response?.data?.error || "Failed to add message");
  }
};

/**
 * Sync local chats to server (one-time migration)
 */
export const syncLocalChatsToServer = async (
  localChats: Chat[],
  activeChat: string | null
): Promise<void> => {
  try {
    const userId = await getOrCreateUserId();
    
    // Clear server chats first
    await clearAllChats();
    
    // Upload each chat
    for (const chat of localChats) {
      await createChat(chat.id, chat.title);
      
      // Upload messages
      if (chat.messages.length > 0) {
        await updateChat(chat.id, { messages: chat.messages });
      }
    }
    
    // Set active chat
    if (activeChat) {
      await setActiveChat(activeChat);
    }
    
    console.log("✅ Successfully synced local chats to server");
  } catch (error: any) {
    console.error("❌ Error syncing chats to server:", error);
    throw new Error(error.response?.data?.error || "Failed to sync chats");
  }
};

export default api;