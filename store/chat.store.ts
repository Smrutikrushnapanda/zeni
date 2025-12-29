// store/chat.store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatStore {
  chats: Chat[];
  activeChat: string | null;
  
  addChat: () => void;
  deleteChat: (id: string) => void;
  clearAllChats: () => void;
  setActiveChat: (id: string) => void;
  getActiveChat: () => Chat | null;
  addMessage: (chatId: string, message: Message) => void;
  updateChatTitle: (chatId: string, title: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,

      addChat: () => {
        const newChat: Chat = {
          id: Date.now().toString(),
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChat: newChat.id,
        }));
      },

      deleteChat: (id: string) => {
        set((state) => {
          const remainingChats = state.chats.filter((chat) => chat.id !== id);
          
          // If deleting active chat, switch to first available chat
          let newActiveChat = state.activeChat;
          if (state.activeChat === id) {
            newActiveChat = remainingChats.length > 0 ? remainingChats[0].id : null;
          }

          // If no chats left, create a new one
          if (remainingChats.length === 0) {
            const defaultChat: Chat = {
              id: Date.now().toString(),
              title: "New Chat",
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            return {
              chats: [defaultChat],
              activeChat: defaultChat.id,
            };
          }

          return {
            chats: remainingChats,
            activeChat: newActiveChat,
          };
        });
      },

      clearAllChats: () => {
        const defaultChat: Chat = {
          id: Date.now().toString(),
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          chats: [defaultChat],
          activeChat: defaultChat.id,
        });
      },

      setActiveChat: (id: string) => {
        set({ activeChat: id });
      },

      getActiveChat: () => {
        const { chats, activeChat } = get();
        return chats.find((chat) => chat.id === activeChat) || null;
      },

      addMessage: (chatId: string, message: Message) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const updatedMessages = [...chat.messages, message];
              
              // Auto-generate title from first user message
              let newTitle = chat.title;
              if (chat.messages.length === 0 && message.role === "user") {
                newTitle = message.text.slice(0, 30) + (message.text.length > 30 ? "..." : "");
              }

              return {
                ...chat,
                messages: updatedMessages,
                title: newTitle,
                updatedAt: Date.now(),
              };
            }
            return chat;
          }),
        }));
      },

      updateChatTitle: (chatId: string, title: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, title, updatedAt: Date.now() }
              : chat
          ),
        }));
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);