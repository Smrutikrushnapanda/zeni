// app/(drawer)/_layout.tsx
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Animated,
  AppState,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
  NativeModules,
  Vibration,
  Share,
  Modal,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef } from "react";

import ChatSidebar from "@/components/chat/ChatSidebar";
import { useThemeStore } from "@/store/theme.store";
import { useAuthStore } from "@/store/authStore";
import { moderateScale, horizontalScale, verticalScale } from "@/utils/metrics";
import { useChatStore } from "@/store/chat.store";
import { configureGoogleSignIn } from '@/app/services/auth';
import { signOutUser } from '@/app/services/auth';
import { router } from 'expo-router';

const { OverlayModule } = NativeModules;

export default function RootLayout() {
  const { mode, theme } = useThemeStore();
  const { addChat } = useChatStore();
  const { user, isGuest, clearAuth } = useAuthStore();
  const [isStarted, setIsStarted] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = screenWidth * 0.85;

  // ✅ Check overlay status on mount and when app comes to foreground
  useEffect(() => {
    const checkOverlayStatus = async () => {
      if (Platform.OS === "android" && OverlayModule) {
        try {
          const running = await OverlayModule.isOverlayRunning();
          setIsStarted(running);
          console.log("Overlay status checked:", running);
        } catch (e) {
          console.error("Error checking overlay status:", e);
          setIsStarted(false);
        }
      }
    };

    checkOverlayStatus();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkOverlayStatus();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      const subscription = DeviceEventEmitter.addListener(
        "OVERLAY_STOPPED",
        () => {
          console.log("Overlay stopped from service");
          setIsStarted(false);
        }
      );
      return () => subscription.remove();
    }
  }, []);

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setShowMenu(false);
            const result = await signOutUser();
            if (result.success) {
              clearAuth();
              Alert.alert("Signed Out", "You have been signed out successfully");
              router.replace('/auth/LoginScreen');
            } else {
              Alert.alert("Error", result.error || "Failed to sign out");
            }
          },
        },
      ]
    );
  };

  // Handle share
  const handleShare = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: 'Check out Zeni AI - Your intelligent AI assistant! Download now.',
        title: 'Zeni AI',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Gentle pulse animation for start button only
  useEffect(() => {
    if (!isStarted) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isStarted]);

  const animateWave = () => {
    waveAnim.setValue(0);
    Animated.timing(waveAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const animatePressIn = () => {
    setIsPressing(true);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 12,
    }).start();
    
    if (!isStarted) {
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  const animatePressOut = () => {
    setIsPressing(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
    }).start();
    
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const toggleStartStop = async () => {
    Vibration.vibrate(30);
    
    if (Platform.OS !== "android") {
      Alert.alert("Not supported", "Overlay works only on Android");
      return;
    }

    if (!OverlayModule) {
      Alert.alert("Error", "Overlay module not available");
      return;
    }

    try {
      if (!isStarted) {
        animateWave();
        
        console.log("🔍 Checking permission...");
        const hasPermission = await OverlayModule.checkOverlayPermission();
        console.log("✅ Permission status:", hasPermission);
        
        if (!hasPermission) {
          Alert.alert(
            "Permission Required",
            "This app needs permission to display over other apps.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Grant Permission",
                onPress: async () => {
                  await OverlayModule.requestOverlayPermission();
                  setTimeout(async () => {
                    try {
                      const recheckPermission = await OverlayModule.checkOverlayPermission();
                      console.log("🔍 Rechecked permission:", recheckPermission);
                      if (recheckPermission) {
                        console.log("🚀 Starting overlay...");
                        await OverlayModule.startOverlay();
                        setIsStarted(true);
                        console.log("✅ Overlay started");
                      } else {
                        Alert.alert("Permission Denied", "Please grant overlay permission to use this feature.");
                      }
                    } catch (error) {
                      console.error("Error after permission grant:", error);
                      Alert.alert("Error", "Failed to start overlay");
                    }
                  }, 2000);
                },
              },
            ]
          );
          return;
        }
        
        console.log("🚀 Starting overlay...");
        await OverlayModule.startOverlay();
        setIsStarted(true);
        console.log("✅ Overlay should be visible now");
        
        setTimeout(async () => {
          try {
            const running = await OverlayModule.isOverlayRunning();
            console.log("🔍 Is overlay running?", running);
            if (!running) {
              Alert.alert("Error", "Failed to start overlay. Check logs.");
              setIsStarted(false);
            }
          } catch (error) {
            console.error("Error checking running status:", error);
          }
        }, 500);
        
      } else {
        console.log("🛑 Stopping overlay...");
        
        try {
          await OverlayModule.stopOverlay();
          setTimeout(() => {
            setIsStarted(false);
            console.log("✅ Overlay stopped");
          }, 300);
        } catch (error) {
          console.error("❌ Error stopping overlay:", error);
          setIsStarted(false);
          Alert.alert("Note", "Overlay stopped but there was a minor error. You can restart if needed.");
        }
      }
    } catch (e: any) {
      console.error("❌ Error in toggle:", e);
      Alert.alert("Error", e?.message || "Failed to toggle overlay");
      setIsStarted(false);
    }
  };

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.2, 0],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const buttonColors = {
    start: {
      background: mode === 'dark' 
        ? `rgba(16, 163, 127, 0.15)` 
        : `rgba(16, 163, 127, 0.08)`,
      border: mode === 'dark' 
        ? `rgba(16, 163, 127, 0.4)` 
        : `rgba(16, 163, 127, 0.3)`,
      text: theme.primary,
      glow: `rgba(16, 163, 127, 0.3)`,
      pressed: `rgba(16, 163, 127, 0.2)`,
    },
    stop: {
      background: mode === 'dark' 
        ? `rgba(142, 142, 160, 0.1)` 
        : `rgba(110, 110, 128, 0.08)`,
      border: mode === 'dark' 
        ? `rgba(142, 142, 160, 0.3)` 
        : `rgba(110, 110, 128, 0.2)`,
      text: theme.mutedText,
      glow: `rgba(142, 142, 160, 0.1)`,
      pressed: `rgba(142, 142, 160, 0.15)`,
    }
  };

  const colors = isStarted ? buttonColors.stop : buttonColors.start;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <Drawer
        drawerContent={(props) => <ChatSidebar {...props} />}
        screenOptions={({ navigation }) => ({
          drawerStyle: {
            width: drawerWidth,
            backgroundColor: theme.background,
          },
          headerStyle: {
            backgroundColor: theme.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
          headerTintColor: theme.text,
          drawerType: "front",
          
          headerTitle: () => (
            <Pressable
              onPressIn={animatePressIn}
              onPressOut={animatePressOut}
              onPress={toggleStartStop}
              style={{
                position: 'relative',
                paddingHorizontal: moderateScale(32),
                paddingVertical: moderateScale(14),
                borderRadius: moderateScale(32),
                overflow: 'hidden',
              }}
            >
              {!isStarted && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: moderateScale(32),
                    backgroundColor: colors.glow,
                    transform: [{ scale: waveScale }],
                    opacity: waveOpacity,
                  }}
                />
              )}

              {!isStarted && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: moderateScale(32),
                    borderWidth: 2,
                    borderColor: colors.glow,
                    transform: [{ scale: glowScale }],
                    opacity: glowOpacity,
                  }}
                />
              )}

              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: moderateScale(32),
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: colors.border,
                }}
              />

              {isPressing && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: moderateScale(32),
                    backgroundColor: colors.pressed,
                  }}
                />
              )}

              <Animated.View
                style={{
                  transform: [{ scale: isStarted ? 1 : pulseAnim }],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: moderateScale(10),
                }}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Ionicons
                    name={isStarted ? "pause-circle" : "play-circle"}
                    size={moderateScale(22)}
                    color={colors.text}
                  />
                </Animated.View>
                
                <Text
                  style={{
                    color: colors.text,
                    fontSize: moderateScale(16),
                    fontWeight: "600",
                    letterSpacing: 0.3,
                  }}
                >
                  {isStarted ? "STOP" : "START"}
                </Text>
                
                <View
                  style={{
                    width: moderateScale(8),
                    height: moderateScale(8),
                    borderRadius: moderateScale(4),
                    backgroundColor: colors.text,
                    opacity: isStarted ? 0.6 : 1,
                  }}
                />
              </Animated.View>
            </Pressable>
          ),

          swipeEdgeWidth: 50,
          overlayColor: 'rgba(0, 0, 0, 0.5)',

          headerRight: () => (
            <View style={{ flexDirection: "row", marginRight: 16 }}>
              {/* New Chat Button */}
              <Pressable
                onPress={() => {
                  addChat();
                  navigation.closeDrawer();
                }}
                style={({ pressed }) => ({
                  padding: 8,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Ionicons
                  name="create-outline"
                  size={moderateScale(24)}
                  color={theme.text}
                />
              </Pressable>

              {/* Three Dot Menu */}
              <Pressable
                onPress={() => setShowMenu(true)}
                style={({ pressed }) => ({
                  padding: 8,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={moderateScale(24)}
                  color={theme.text}
                />
              </Pressable>
            </View>
          ),
        })}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Chat",
            title: "Zeni AI",
          }}
        />
      </Drawer>

      {/* Three-dot Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: verticalScale(60),
              right: horizontalScale(16),
              backgroundColor: theme.surface,
              borderRadius: moderateScale(12),
              minWidth: horizontalScale(180),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {/* Share Option */}
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: verticalScale(14),
                paddingHorizontal: horizontalScale(16),
                backgroundColor: pressed ? theme.background : 'transparent',
                borderTopLeftRadius: moderateScale(12),
                borderTopRightRadius: moderateScale(12),
              })}
            >
              <Ionicons
                name="share-outline"
                size={moderateScale(20)}
                color={theme.text}
              />
              <Text
                style={{
                  color: theme.text,
                  fontSize: moderateScale(15),
                  marginLeft: horizontalScale(12),
                }}
              >
                Share App
              </Text>
            </Pressable>

            {/* Divider */}
            {!isGuest && (
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border,
                  marginHorizontal: horizontalScale(16),
                }}
              />
            )}

            {/* Logout Option (only if logged in) */}
            {!isGuest && (
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: verticalScale(14),
                  paddingHorizontal: horizontalScale(16),
                  backgroundColor: pressed ? theme.background : 'transparent',
                  borderBottomLeftRadius: moderateScale(12),
                  borderBottomRightRadius: moderateScale(12),
                })}
              >
                <Ionicons
                  name="log-out-outline"
                  size={moderateScale(20)}
                  color="#FF6B6B"
                />
                <Text
                  style={{
                    color: "#FF6B6B",
                    fontSize: moderateScale(15),
                    marginLeft: horizontalScale(12),
                  }}
                >
                  Sign Out
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}