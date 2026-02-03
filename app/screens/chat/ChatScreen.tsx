// app/screens/chat/ChatScreen.tsx
import { Message, useChatStore } from "@/store/chat.store";
import { useThemeStore } from "@/store/theme.store";
import { useAuthStore } from "@/store/authStore";
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
  Animated,
  Modal,
  Linking,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { FormattedMessage } from "@/components/chat/FormattedMessage";
import { sendChatMessage } from "@/app/services/api.service";
import { useRouter } from "expo-router";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MIC_PERMISSION_KEY = '@mic_permission_asked';

export default function ChatScreen() {
  const { theme } = useThemeStore();
  const { getActiveChat, addMessage, activeChat } = useChatStore();
  const { user, isGuest } = useAuthStore();
  const router = useRouter();
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

  // Toast notification state
  const [showCopyToast, setShowCopyToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Speech-to-text
  const { recognizing, transcript, error: speechError, startListening, stopListening, abort } = useSpeechToText();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Permission modal state
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [micPermissionAsked, setMicPermissionAsked] = useState(false);

  // Load permission state on mount
  useEffect(() => {
    loadPermissionState();
  }, []);

  const loadPermissionState = async () => {
    try {
      const asked = await AsyncStorage.getItem(MIC_PERMISSION_KEY);
      if (asked === 'true') {
        setMicPermissionAsked(true);
      }
    } catch (error) {
      console.error('Error loading permission state:', error);
    }
  };

  const savePermissionState = async () => {
    try {
      await AsyncStorage.setItem(MIC_PERMISSION_KEY, 'true');
      setMicPermissionAsked(true);
    } catch (error) {
      console.error('Error saving permission state:', error);
    }
  };

  // Update input when transcript changes
  useEffect(() => {
    if (transcript && recognizing) {
      setInput(transcript);
    }
  }, [transcript, recognizing]);

  // Handle final transcript when recognition stops
  useEffect(() => {
    if (!recognizing && transcript) {
      setInput(transcript);
    }
  }, [recognizing, transcript]);

  // Handle speech recognition errors
  useEffect(() => {
    if (speechError && speechError !== 'no-speech') {
      Alert.alert(
        'Speech Recognition Error',
        `Error: ${speechError}. Please try again.`,
        [{ text: 'OK' }]
      );
    }
  }, [speechError]);

  // Pulse animation for recording mic
  useEffect(() => {
    if (recognizing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulse.start();
      glow.start();
      
      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [recognizing]);

  // Get user's first name
  const getUserName = () => {
    if (isGuest) return null;
    return user?.displayName?.split(' ')[0] || null;
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = getUserName();
    
    if (hour < 12) {
      return name ? `Good morning, ${name}` : "Good morning";
    } else if (hour < 17) {
      return name ? `Good afternoon, ${name}` : "Good afternoon";
    } else if (hour < 21) {
      return name ? `Good evening, ${name}` : "Good evening";
    } else {
      return name ? `Hello, ${name}` : "My Night Buddy";
    }
  };

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
  const trimmedInput = input.trim();
  
  if (!trimmedInput || !activeChat || isLoading || isTyping) {
    return;
  }

  const userText = trimmedInput;
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

    // ✅ ADDED: Check length for typing animation
    if (reply.length > 300) {
      // Long response → show instantly (no typing animation)
      addMessage(activeChat, {
        text: reply,
        isUser: false,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Short response → typing animation
      setTypingText(reply);
      setIsTyping(true);
    }
  } catch (err: any) {
    console.error(err);
    setError("Failed to connect to AI");

    addMessage(activeChat, {
      text: "Sorry, I'm having trouble connecting right now. Please try again later.",
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

  // ================= HANDLE MIC PRESS =================
  const handleMicPress = async () => {
    if (recognizing) {
      stopListening();
      if (transcript && !input) {
        setInput(transcript);
      }
      return;
    }

    if (micPermissionAsked) {
      const started = await startListening();
      if (!started) {
        Alert.alert(
          'Permission Required',
          'Microphone permission was denied. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return;
    }

    setShowPermissionModal(true);
  };

  // ================= HANDLE CANCEL RECORDING =================
  const handleCancelRecording = () => {
    abort();
    setInput("");
  };

  // ================= COPY TO CLIPBOARD WITH TOAST =================
  const handleCopyMessage = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast();
  };

  const showToast = () => {
    setShowCopyToast(true);
    
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowCopyToast(false));
  };

  // ================= PERMISSION MODAL =================
  const PermissionModal = () => (
    <Modal
      visible={showPermissionModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPermissionModal(false)}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={() => setShowPermissionModal(false)}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: moderateScale(16),
            padding: moderateScale(24),
            marginHorizontal: horizontalScale(32),
            maxWidth: horizontalScale(320),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Pressable
            onPress={() => setShowPermissionModal(false)}
            style={({ pressed }) => ({
              position: 'absolute',
              top: moderateScale(12),
              right: moderateScale(12),
              padding: moderateScale(8),
              opacity: pressed ? 0.5 : 1,
              zIndex: 10,
            })}
          >
            <Ionicons name="close" size={moderateScale(24)} color={theme.mutedText} />
          </Pressable>

          <View style={{ alignItems: 'center', marginBottom: verticalScale(16) }}>
            <View
              style={{
                width: moderateScale(64),
                height: moderateScale(64),
                borderRadius: moderateScale(32),
                backgroundColor: theme.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="mic" size={moderateScale(32)} color={theme.primary} />
            </View>
          </View>

          <Text
            style={{
              fontSize: moderateScale(20),
              fontWeight: '700',
              color: theme.text,
              textAlign: 'center',
              marginBottom: verticalScale(8),
            }}
          >
            Enable Voice Input
          </Text>

          <Text
            style={{
              fontSize: moderateScale(15),
              color: theme.mutedText,
              textAlign: 'center',
              lineHeight: verticalScale(22),
              marginBottom: verticalScale(24),
            }}
          >
            Zeni AI needs access to your microphone to convert your speech to text
          </Text>

          <View style={{ gap: verticalScale(12) }}>
            <Pressable
              onPress={async () => {
                setShowPermissionModal(false);
                await savePermissionState();
                
                const started = await startListening();
                if (!started) {
                  Alert.alert(
                    'Permission Denied',
                    'Microphone permission was denied. Would you like to open settings to enable it?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                  );
                }
              }}
              style={({ pressed }) => ({
                backgroundColor: theme.primary,
                paddingVertical: verticalScale(14),
                borderRadius: moderateScale(12),
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: moderateScale(16),
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                Allow Microphone Access
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowPermissionModal(false);
                savePermissionState();
              }}
              style={({ pressed }) => ({
                paddingVertical: verticalScale(14),
                borderRadius: moderateScale(12),
                backgroundColor: pressed ? theme.background : 'transparent',
              })}
            >
              <Text
                style={{
                  color: theme.mutedText,
                  fontSize: moderateScale(16),
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                Not Now
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  // ================= RENDER MESSAGE WITH COPY ICON =================
  // ================= RENDER MESSAGE WITH COPY ICON BELOW =================
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
        <View style={{ alignItems: 'flex-end' }}>
          {/* Message Bubble */}
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

          {/* Copy Icon Below */}
          <Pressable
            onPress={() => handleCopyMessage(item.text)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: horizontalScale(4),
              marginTop: verticalScale(4),
              paddingHorizontal: horizontalScale(8),
              paddingVertical: verticalScale(4),
              opacity: pressed ? 0.5 : 0.6,
            })}
          >
            <Ionicons
              name="copy-outline"
              size={moderateScale(14)}
              color={theme.mutedText}
            />
            <Text
              style={{
                fontSize: moderateScale(12),
                color: theme.mutedText,
              }}
            >
              Copy
            </Text>
          </Pressable>
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
      <View style={{ alignItems: 'flex-start' }}>
        {/* Message Content */}
        <View style={{ maxWidth: "90%" }}>
          <FormattedMessage text={item.text} color={theme.text} onCopy={handleCopyMessage} />
        </View>

        {/* Copy Icon Below */}
        <Pressable
          onPress={() => handleCopyMessage(item.text)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: horizontalScale(4),
            marginTop: verticalScale(4),
            paddingHorizontal: horizontalScale(8),
            paddingVertical: verticalScale(4),
            opacity: pressed ? 0.5 : 0.6,
          })}
        >
          <Ionicons
            name="copy-outline"
            size={moderateScale(14)}
            color={theme.mutedText}
          />
          <Text
            style={{
              fontSize: moderateScale(12),
              color: theme.mutedText,
            }}
          >
            Copy
          </Text>
        </Pressable>
      </View>
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
          {getGreeting()}
        </Text>
        
        <Text
          style={{
            color: theme.mutedText,
            fontSize: moderateScale(16),
            textAlign: "center",
            lineHeight: verticalScale(24),
            marginBottom: verticalScale(24),
          }}
        >
          How can I help you today?
        </Text>

        {isGuest && (
          <Pressable
            onPress={() => router.push('/auth/LoginScreen')}
            style={({ pressed }) => ({
              backgroundColor: theme.primary,
              paddingHorizontal: horizontalScale(24),
              paddingVertical: verticalScale(12),
              borderRadius: moderateScale(24),
              flexDirection: "row",
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons
              name="log-in-outline"
              size={moderateScale(20)}
              color="#FFFFFF"
              style={{ marginRight: horizontalScale(8) }}
            />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: moderateScale(16),
                fontWeight: "600",
              }}
            >
              Sign in to save your chats
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

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

      {recognizing && (
        <View
          style={{
            backgroundColor: theme.primary + '15',
            paddingVertical: verticalScale(12),
            paddingHorizontal: horizontalScale(16),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: theme.primary + '30',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View 
              style={{ 
                transform: [{ scale: pulseAnim }],
                marginRight: horizontalScale(10),
              }}
            >
              <View
                style={{
                  width: moderateScale(10),
                  height: moderateScale(10),
                  borderRadius: moderateScale(5),
                  backgroundColor: '#FF3B30',
                }}
              />
            </Animated.View>
            <Text 
              style={{ 
                color: theme.text, 
                fontSize: moderateScale(15),
                fontWeight: '600',
              }}
            >
              {transcript ? 'Speaking...' : 'Listening...'}
            </Text>
          </View>
          
          <Pressable
            onPress={handleCancelRecording}
            style={({ pressed }) => ({
              padding: moderateScale(4),
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Ionicons name="close-circle" size={moderateScale(24)} color={theme.mutedText} />
          </Pressable>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={{ flexGrow: 1 }}
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
                <FormattedMessage text={displayText} color={theme.text} onCopy={handleCopyMessage} />
              </View>
            )}
          </>
        }
      />

      {/* COPY SUCCESS TOAST */}
      {showCopyToast && (
        <Animated.View
          style={{
            position: 'absolute',
            top: verticalScale(100),
            alignSelf: 'center',
            backgroundColor: theme.primary,
            paddingHorizontal: horizontalScale(20),
            paddingVertical: verticalScale(10),
            borderRadius: moderateScale(20),
            flexDirection: 'row',
            alignItems: 'center',
            gap: horizontalScale(8),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          }}
        >
          <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#FFFFFF" />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: moderateScale(14),
              fontWeight: '600',
            }}
          >
            Copied!
          </Text>
        </Animated.View>
      )}

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
          />

          {recognizing ? (
            <Pressable
              onPress={handleMicPress}
              style={({ pressed }) => ({
                position: 'relative',
                width: moderateScale(40),
                height: moderateScale(40),
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  width: moderateScale(40),
                  height: moderateScale(40),
                  borderRadius: moderateScale(20),
                  backgroundColor: theme.primary,
                  opacity: glowOpacity,
                }}
              />
              <Ionicons name="checkmark-circle" size={moderateScale(32)} color={theme.primary} />
            </Pressable>
          ) : input.trim().length > 0 ? (
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
                <Ionicons name="arrow-up" size={moderateScale(20)} color="#FFFFFF" />
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleMicPress}
              disabled={isLoading || isTyping}
              style={({ pressed }) => ({
                width: moderateScale(40),
                height: moderateScale(40),
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="mic-outline" size={moderateScale(24)} color={theme.mutedText} />
            </Pressable>
          )}
        </View>
      </View>

      <PermissionModal />
    </KeyboardAvoidingView>
  );
}