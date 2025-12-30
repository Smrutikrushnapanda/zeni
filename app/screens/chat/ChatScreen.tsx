import { Message, useChatStore } from "@/store/chat.store";
import { useThemeStore } from "@/store/theme.store";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "@/utils/metrics";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { FormattedMessage } from "@/components/chat/FormattedMessage";
import { sendChatMessage } from "@/app/services/api.service";

export default function ChatScreen() {
  const { theme } = useThemeStore();
  const { getActiveChat, addMessage, activeChat } = useChatStore();
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const chat = getActiveChat();
  const messages = chat?.messages || [];

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // ================= SCROLL =================
  useEffect(() => {
    if (messages.length === 0) return;
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isTyping]);

  // ================= TYPING EFFECT =================
  useEffect(() => {
    if (!isTyping || !typingText || !activeChat) return;

    let index = 0;

    const typeNext = () => {
      index++;
      setDisplayText(typingText.slice(0, index));

      if (index < typingText.length) {
        typingTimeout.current = setTimeout(typeNext, 12);
      } else {
        setIsTyping(false);
        setDisplayText("");

        addMessage(activeChat, {
          text: typingText,
          isUser: false,
          timestamp: new Date().toISOString(),
        });

        setTypingText("");
      }
    };

    typeNext();

    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, [typingText, isTyping, activeChat, addMessage]);

  // ================= SEND MESSAGE =================
  const sendMessage = async () => {
    if (!input.trim() || !activeChat || isLoading || isTyping) return;

    const userText = input.trim();
    setInput("");
    setError(null);

    addMessage(activeChat, {
      text: userText,
      isUser: true,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    try {
      const res = await sendChatMessage(userText, activeChat);
      const reply = res?.response || res?.reply || "No response";

      setTypingText(reply);
      setIsTyping(true);
    } catch (err: any) {
      console.error(err);
      setError("Failed to connect to AI");

      addMessage(activeChat, {
        text:
          "Sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date().toISOString(),
      });

      Alert.alert(
        "Connection Error",
        "Make sure your backend server is running.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ================= RENDER MESSAGE =================
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <View
          style={{
            paddingHorizontal: horizontalScale(16),
            paddingVertical: verticalScale(12),
            alignItems: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              padding: moderateScale(12),
              borderRadius: moderateScale(20),
              maxWidth: "80%",
            }}
          >
            <Text style={{ color: theme.text }}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={{
          paddingHorizontal: horizontalScale(16),
          paddingVertical: verticalScale(12),
        }}
      >
        <FormattedMessage text={item.text} color={theme.text} />
      </View>
    );
  };

  // ================= EMPTY CHAT STATE =================
  const renderEmptyChat = () => {
    if (messages.length > 0) return null;
    
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: horizontalScale(32),
        }}
      >
        <Ionicons
          name="chatbubbles-outline"
          size={moderateScale(80)}
          color={theme.mutedText}
          style={{ opacity: 0.3, marginBottom: verticalScale(16) }}
        />
        <Text
          style={{
            color: theme.text,
            fontSize: moderateScale(24),
            fontWeight: "600",
            marginBottom: verticalScale(8),
            textAlign: "center",
          }}
        >
          Welcome to Zeni AI
        </Text>
        <Text
          style={{
            color: theme.mutedText,
            fontSize: moderateScale(16),
            textAlign: "center",
            lineHeight: verticalScale(24),
          }}
        >
          Ask me anything! I'm here to help with your questions, tasks, and conversations.
        </Text>
      </View>
    );
  };

  // ================= UI =================
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={verticalScale(90)}
    >
      {error && (
        <View
          style={{
            backgroundColor: "#FF6B6B",
            padding: verticalScale(8),
            paddingHorizontal: horizontalScale(16),
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", flex: 1 }}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={{
          flexGrow: 1,
        }}
        ListEmptyComponent={renderEmptyChat}
        ListFooterComponent={
          <>
            {isLoading && (
              <View
                style={{
                  paddingHorizontal: horizontalScale(16),
                  paddingVertical: verticalScale(12),
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color={theme.mutedText} />
                <Text
                  style={{
                    marginLeft: horizontalScale(8),
                    color: theme.mutedText,
                    fontSize: moderateScale(14),
                  }}
                >
                  AI is thinking...
                </Text>
              </View>
            )}
            {isTyping && displayText && (
              <View
                style={{
                  paddingHorizontal: horizontalScale(16),
                  paddingVertical: verticalScale(12),
                }}
              >
                <FormattedMessage text={displayText} color={theme.text} />
              </View>
            )}
          </>
        }
      />

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingHorizontal: horizontalScale(12),
          paddingVertical: verticalScale(12),
          backgroundColor: theme.background,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.surface,
            borderRadius: moderateScale(24),
            paddingHorizontal: horizontalScale(12),
            paddingVertical: verticalScale(8),
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Zeni AI..."
            placeholderTextColor={theme.mutedText}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              color: theme.text,
              fontSize: moderateScale(16),
              maxHeight: verticalScale(100),
              paddingHorizontal: horizontalScale(8),
            }}
            editable={!isLoading && !isTyping}
            onSubmitEditing={sendMessage}
          />

          {input.trim() ? (
            <Pressable
              onPress={sendMessage}
              disabled={isLoading || isTyping}
              style={({ pressed }) => ({
                backgroundColor: theme.primary,
                width: moderateScale(36),
                height: moderateScale(36),
                borderRadius: moderateScale(18),
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed || isLoading || isTyping ? 0.7 : 1,
              })}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={moderateScale(20)}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => ({
                padding: moderateScale(8),
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Ionicons
                name="mic-outline"
                size={moderateScale(24)}
                color={theme.mutedText}
              />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}