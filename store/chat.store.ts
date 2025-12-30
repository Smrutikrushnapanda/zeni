import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "@/app/services/api.service";

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

interface ChatStore {
  chats: Chat[];
  activeChat: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;

  // Actions
  loadChatsFromServer: () => Promise<void>;
  addChat: () => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  clearAllChats: () => Promise<void>;
  setActiveChat: (id: string) => Promise<void>;
  addMessage: (chatId: string, message: Omit<Message, "id">) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;

  // 🔥 FIX
  getActiveChat: () => Chat | null;
  getActiveMessages: () => Message[];

  syncLocalToServer: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChat: null,
  isLoading: false,
  isSyncing: false,
  lastSyncTime: null,

  // ================= LOAD CHATS =================
  loadChatsFromServer: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getAllChats();

      set({
        chats: data.chats,
        activeChat: data.activeChat,
        lastSyncTime: new Date().toISOString(),
        isLoading: false,
      });
    } catch (error) {
      console.error("❌ Server failed, using local storage");

      const localChats = await AsyncStorage.getItem("chats");
      const localActiveChat = await AsyncStorage.getItem("activeChat");

      if (localChats) {
        set({
          chats: JSON.parse(localChats),
          activeChat: localActiveChat,
          isLoading: false,
        });
      } else {
        const defaultChat: Chat = {
          id: `chat_${Date.now()}`,
          title: "New Chat",
          messages: [],
          createdAt: new Date().toISOString(),
        };

        set({
          chats: [defaultChat],
          activeChat: defaultChat.id,
          isLoading: false,
        });
      }
    }
  },

  // ================= ADD CHAT =================
  addChat: async () => {
    const id = `chat_${Date.now()}`;
    const title = "New Chat";

    try {
      await api.createChat(id, title);
    } catch {}

    set((state) => ({
      chats: [
        ...state.chats,
        { id, title, messages: [], createdAt: new Date().toISOString() },
      ],
      activeChat: id,
    }));
  },

  // ================= DELETE CHAT =================
  deleteChat: async (id) => {
    const state = get();
    if (state.chats.length <= 1) return;

    try {
      await api.deleteChat(id);
    } catch {}

    const updated = state.chats.filter((c) => c.id !== id);
    set({
      chats: updated,
      activeChat: updated[0]?.id ?? null,
    });
  },

  // ================= CLEAR ALL =================
  clearAllChats: async () => {
    try {
      await api.clearAllChats();
    } catch {}

    const chat: Chat = {
      id: `chat_${Date.now()}`,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
    };

    set({ chats: [chat], activeChat: chat.id });
  },

  // ================= SET ACTIVE =================
  setActiveChat: async (id) => {
    try {
      await api.setActiveChat(id);
    } catch {}

    set({ activeChat: id });
  },

  // ================= ADD MESSAGE =================
  addMessage: async (chatId, message) => {
    const state = get();
    const index = state.chats.findIndex((c) => c.id === chatId);
    if (index === -1) return;

    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}`,
    };

    const updated = [...state.chats];
    updated[index] = {
      ...updated[index],
      messages: [...updated[index].messages, newMessage],
    };

    set({ chats: updated });

    try {
      await api.addMessageToChat(chatId, message);
    } catch {
      await AsyncStorage.setItem("chats", JSON.stringify(updated));
    }
  },

  // ================= UPDATE TITLE =================
  updateChatTitle: async (chatId, title) => {
    const state = get();
    const index = state.chats.findIndex((c) => c.id === chatId);
    if (index === -1) return;

    try {
      await api.updateChat(chatId, { title });
    } catch {}

    const updated = [...state.chats];
    updated[index] = { ...updated[index], title };
    set({ chats: updated });
  },

  // 🔥 FIXED FUNCTION
  getActiveChat: () => {
    const { chats, activeChat } = get();
    return chats.find((c) => c.id === activeChat) || null;
  },

  getActiveMessages: () => {
    const chat = get().chats.find((c) => c.id === get().activeChat);
    return chat?.messages || [];
  },

  // ================= SYNC =================
  syncLocalToServer: async () => {
    set({ isSyncing: true });
    try {
      const chats = await AsyncStorage.getItem("chats");
      const active = await AsyncStorage.getItem("activeChat");

      if (chats) {
        await api.syncLocalChatsToServer(JSON.parse(chats), active);
        await get().loadChatsFromServer();
      }
    } finally {
      set({ isSyncing: false });
    }
  },
}));
