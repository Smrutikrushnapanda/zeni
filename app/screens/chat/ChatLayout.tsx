import ChatScreen from "@/app/screens/chat/ChatScreen";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { useThemeStore } from "@/store/theme.store";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "@/utils/metrics";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  View,
  Dimensions,
  StyleSheet,
} from "react-native";

const SIDEBAR_WIDTH = Math.min(
  horizontalScale(300),
  Dimensions.get("window").width * 0.8
);

export default function ChatLayout() {
  const { theme } = useThemeStore();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarVisible((prev) => !prev);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sidebar */}
      {isSidebarVisible && (
        <View
          style={[
            styles.sidebar,
            {
              width: SIDEBAR_WIDTH,
              backgroundColor: theme.background,
              borderRightColor: theme.border,
            },
          ]}
          pointerEvents="auto"
        >
          {/* Pass dummy navigation to avoid crash */}
          <ChatSidebar
            navigation={{
              closeDrawer: () => setIsSidebarVisible(false),
            }}
          />
        </View>
      )}

      {/* Main Chat Area */}
      <View style={styles.main}>
        {/* Toggle Button */}
        <View style={styles.toggleWrapper} pointerEvents="box-none">
          <Pressable
            onPress={toggleSidebar}
            style={({ pressed }) => [
              styles.toggleButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name={isSidebarVisible ? "chevron-back" : "menu"}
              size={moderateScale(22)}
              color={theme.text}
            />
          </Pressable>
        </View>

        <ChatScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    zIndex: 20,
    borderRightWidth: 1,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  main: {
    flex: 1,
  },
  toggleWrapper: {
    position: "absolute",
    top: verticalScale(16),
    left: horizontalScale(16),
    zIndex: 50,
  },
  toggleButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
