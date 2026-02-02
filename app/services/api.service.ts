import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Railway backend (correct)
const API_URL = "https://zeni-backend-xceb.onrender.com";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================= INTERCEPTORS =================

api.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error(
      "❌ API ERROR:",
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

// ================= TYPES =================

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
}

export interface UserChatsData {
  chats: Chat[];
  activeChat: string | null;
}

// ================= DEVICE USER =================

const USER_ID_KEY = "zeni_user_id";

export const getOrCreateUserId = async (): Promise<string> => {
  let userId = await AsyncStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

// ================= AI CHAT =================

export const sendChatMessage = async (
  message: string,
  chatId: string
) => {
  const res = await api.post("/chat", {
    message,
    chatId,
  });
  return res.data;
};

// ================= CHAT STORAGE =================

// GET all chats
export const getAllChats = async (): Promise<UserChatsData> => {
  const userId = await getOrCreateUserId();
  const res = await api.get(`/chats/${userId}`);
  return res.data.data;
};

// CREATE chat - ✅ FIXED
export const createChat = async (
  id: string,
  title: string
): Promise<void> => {
  const userId = await getOrCreateUserId();
  await api.post(`/chats/${userId}/chats`, {
    id,
    title,
  });
};

// DELETE chat - ✅ FIXED
export const deleteChat = async (chatId: string): Promise<void> => {
  const userId = await getOrCreateUserId();
  await api.delete(`/chats/${userId}/chats/${chatId}`);
};

// CLEAR all chats - ✅ FIXED
export const clearAllChats = async (): Promise<void> => {
  const userId = await getOrCreateUserId();
  await api.delete(`/chats/${userId}/chats`);
};

// SET active chat - ✅ FIXED
export const setActiveChat = async (
  chatId: string | null
): Promise<void> => {
  const userId = await getOrCreateUserId();
  await api.put(`/chats/${userId}/active-chat`, { chatId });
};

// ADD message - ✅ FIXED
export const addMessageToChat = async (
  chatId: string,
  message: Omit<ChatMessage, "id">
): Promise<void> => {
  const userId = await getOrCreateUserId();
  await api.post(`/chats/${userId}/chats/${chatId}/messages`, { message });
};

// UPDATE chat title - ✅ FIXED
export const updateChat = async (
  chatId: string,
  updates: { title?: string; messages?: ChatMessage[] }
): Promise<void> => {
  const userId = await getOrCreateUserId();
  await api.put(`/chats/${userId}/chats/${chatId}`, updates);
};

// SYNC (optional)
export const syncLocalChatsToServer = async (
  chats: Chat[],
  activeChat: string | null
) => {
  await clearAllChats();

  for (const chat of chats) {
    await createChat(chat.id, chat.title);
    if (chat.messages.length > 0) {
      await updateChat(chat.id, { messages: chat.messages });
    }
  }

  if (activeChat) {
    await setActiveChat(activeChat);
  }
};

export default api;