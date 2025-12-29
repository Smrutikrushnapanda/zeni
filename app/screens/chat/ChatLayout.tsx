import ChatScreen from "@/app/screens/chat/ChatScreen";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { useThemeStore } from "@/store/theme.store";
import { horizontalScale, moderateScale, verticalScale } from "@/utils/metrics";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";

export default function ChatLayout() {
  const { theme } = useThemeStore();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const handleToggle = () => {
    setIsSidebarVisible(prev => !prev);
  };

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: theme.background }}>
      {/* Sidebar */}
      {isSidebarVisible && (
        <View
          style={{
            zIndex: 50,
            shadowColor: "#000",
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <ChatSidebar />
        </View>
      )}

      {/* Main Chat Area with Toggle Button */}
      <View style={{ flex: 1 }}>
        {/* Sidebar Toggle Button - Always on top */}
        <View
          style={{
            position: "absolute",
            top: verticalScale(16),
            left: horizontalScale(16),
            zIndex: 100,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={handleToggle}
            style={({ pressed }) => ({
              backgroundColor: theme.surface,
              borderRadius: moderateScale(8),
              padding: moderateScale(8),
              borderWidth: 1,
              borderColor: theme.border,
              opacity: pressed ? 0.7 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            })}
          >
            <Ionicons
              name={isSidebarVisible ? "chevron-back" : "menu"}
              size={moderateScale(24)}
              color={theme.text}
            />
          </Pressable>
        </View>
        <ChatScreen />
      </View>
    </View>
  );
}