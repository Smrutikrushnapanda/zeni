// app/screens/chat/ChatScreen.tsx
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
import { sendChatMessage } from "@/api/api";
import { FormattedMessage } from "@/components/chat/FormattedMessage";

export default function ChatScreen() {
  const { theme } = useThemeStore();
  const { getActiveChat, addMessage, activeChat } = useChatStore();
  const flatListRef = useRef<FlatList>(null);

  const chat = getActiveChat();
  const messages = chat?.messages || [];

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Typing animation effect
  useEffect(() => {
    if (!isTyping || !typingText) return;

    let currentIndex = 0;
    const fullText = typingText;
    const tempMessage: Message = {
      id: "typing-temp",
      role: "assistant",
      text: "",
      timestamp: Date.now(),
    };

    const typeChar = () => {
      if (currentIndex < fullText.length) {
        tempMessage.text = fullText.substring(0, currentIndex + 1);
        currentIndex++;
        
        // Update every 10ms for smooth typing
        setTimeout(typeChar, 10);
      } else {
        // Typing complete
        setIsTyping(false);
        if (activeChat) {
          addMessage(activeChat, {
            id: Date.now().toString(),
            role: "assistant",
            text: fullText,
            timestamp: Date.now(),
          });
        }
        setTypingText("");
      }
    };

    typeChar();
  }, [typingText, isTyping, activeChat, addMessage]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || isLoading) return;

    const userMessageText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: userMessageText,
      timestamp: Date.now(),
    };

    addMessage(activeChat, userMessage);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Call Groq AI API through backend
      const response = await sendChatMessage(userMessageText, activeChat);

      // Start typing animation
      setTypingText(response.reply);
      setIsTyping(true);
      
    } catch (error: any) {
      console.error("Failed to get AI response:", error);
      setError(error.message || "Failed to connect to AI");
      
      // Show error message in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "Sorry, I'm having trouble connecting right now. Please check if the backend is running and try again.",
        timestamp: Date.now(),
      };
      addMessage(activeChat, errorMessage);
      
      // Show alert
      Alert.alert(
        "Connection Error",
        "Make sure your backend server is running on the correct IP address.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";

    if (isUser) {
      // User message - gray bubble on right
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
              paddingVertical: verticalScale(12),
              paddingHorizontal: horizontalScale(16),
              borderRadius: moderateScale(20),
              maxWidth: "80%",
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: moderateScale(16),
                lineHeight: verticalScale(22),
              }}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    } else {
      // AI message - formatted text on left
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
    }
  };

  const renderLoadingIndicator = () => (
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
  );

  const renderTypingMessage = () => {
    if (!isTyping || !typingText) return null;

    return (
      <View
        style={{
          paddingHorizontal: horizontalScale(16),
          paddingVertical: verticalScale(12),
        }}
      >
        <FormattedMessage 
          text={typingText.substring(0, Math.floor(typingText.length))} 
          color={theme.text} 
        />
      </View>
    );
  };

  if (!chat) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.mutedText, fontSize: moderateScale(16) }}>
          No chat selected
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={verticalScale(100)}
    >
      {/* Error banner */}
      {error && (
        <View
          style={{
            backgroundColor: "#FF6B6B",
            paddingVertical: verticalScale(8),
            paddingHorizontal: horizontalScale(16),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: moderateScale(14),
              flex: 1,
            }}
          >
            {error}
          </Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={moderateScale(20)} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: verticalScale(16),
        }}
        ListFooterComponent={
          <>
            {isLoading && renderLoadingIndicator()}
            {renderTypingMessage()}
          </>
        }
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* Input bar */}
      <View
        style={{
          paddingHorizontal: horizontalScale(16),
          paddingVertical: verticalScale(12),
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: theme.surface,
            borderRadius: moderateScale(24),
            paddingHorizontal: horizontalScale(12),
            paddingVertical: verticalScale(8),
          }}
        >
          {/* Plus/Attach Button */}
          <Pressable
            style={({ pressed }) => ({
              padding: moderateScale(8),
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Ionicons
              name="add-circle-outline"
              size={moderateScale(24)}
              color={theme.mutedText}
            />
          </Pressable>

          {/* Text Input */}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Zeni AI..."
            placeholderTextColor={theme.mutedText}
            multiline
            maxLength={2000}
            editable={!isLoading && !isTyping}
            style={{
              flex: 1,
              color: theme.text,
              fontSize: moderateScale(16),
              maxHeight: verticalScale(120),
              paddingVertical: verticalScale(8),
              paddingHorizontal: horizontalScale(8),
            }}
            onSubmitEditing={sendMessage}
          />

          {/* Voice/Send Button */}
          {input.trim() ? (
            <Pressable
              onPress={sendMessage}
              disabled={isLoading || isTyping}
              style={({ pressed }) => ({
                backgroundColor: theme.primary,
                width: moderateScale(32),
                height: moderateScale(32),
                borderRadius: moderateScale(16),
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed || isLoading || isTyping ? 0.7 : 1,
                marginLeft: horizontalScale(4),
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