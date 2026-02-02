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

  // Getters
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

      // ✅ FIX: If no chats exist on server, create one
      if (data.chats.length === 0) {
        console.log("📝 No chats found, creating default chat");
        const newChatId = `chat_${Date.now()}`;
        await api.createChat(newChatId, "New Chat");
        
        set({
          chats: [{
            id: newChatId,
            title: "New Chat",
            messages: [],
            createdAt: new Date().toISOString(),
          }],
          activeChat: newChatId,
          lastSyncTime: new Date().toISOString(),
          isLoading: false,
        });
      } else {
        // ✅ FIX: If no active chat, use first chat
        set({
          chats: data.chats,
          activeChat: data.activeChat || data.chats[0].id,
          lastSyncTime: new Date().toISOString(),
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("❌ Server failed, using local storage");

      const localChats = await AsyncStorage.getItem("chats");
      const localActiveChat = await AsyncStorage.getItem("activeChat");

      if (localChats) {
        const parsedChats = JSON.parse(localChats);
        set({
          chats: parsedChats,
          activeChat: localActiveChat || parsedChats[0]?.id || null,
          isLoading: false,
        });
      } else {
        // ✅ FIX: Create default chat if nothing in local storage
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
    } catch (error) {
      console.error("❌ Failed to create chat on server:", error);
    }

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
    if (state.chats.length <= 1) {
      console.log("❌ Cannot delete last chat");
      return;
    }

    try {
      await api.deleteChat(id);
    } catch (error) {
      console.error("❌ Failed to delete chat on server:", error);
    }

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
    } catch (error) {
      console.error("❌ Failed to clear chats on server:", error);
    }

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
    } catch (error) {
      console.error("❌ Failed to set active chat on server:", error);
    }

    set({ activeChat: id });
  },

  // ================= ADD MESSAGE =================
  addMessage: async (chatId, message) => {
    const state = get();
    const index = state.chats.findIndex((c) => c.id === chatId);
    if (index === -1) {
      console.error("❌ Chat not found:", chatId);
      return;
    }

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
    } catch (error) {
      console.error("❌ Failed to add message to server, saving locally:", error);
      await AsyncStorage.setItem("chats", JSON.stringify(updated));
    }
  },

  // ================= UPDATE TITLE =================
  updateChatTitle: async (chatId, title) => {
    const state = get();
    const index = state.chats.findIndex((c) => c.id === chatId);
    if (index === -1) {
      console.error("❌ Chat not found:", chatId);
      return;
    }

    try {
      await api.updateChat(chatId, { title });
    } catch (error) {
      console.error("❌ Failed to update chat title on server:", error);
    }

    const updated = [...state.chats];
    updated[index] = { ...updated[index], title };
    set({ chats: updated });
  },

  // ================= GETTERS =================
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
    } catch (error) {
      console.error("❌ Failed to sync chats to server:", error);
    } finally {
      set({ isSyncing: false });
    }
  },
}));