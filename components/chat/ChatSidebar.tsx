import { useChatStore } from "@/store/chat.store";
import { useThemeStore } from "@/store/theme.store";
import {
  horizontalScale,
  moderateScale,
  verticalScale,
} from "@/utils/metrics";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

export default function ChatSidebar(props: any) {
  const { theme, mode, toggleTheme } = useThemeStore();
  const { chats, activeChat, addChat, deleteChat, setActiveChat, clearAllChats } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const filteredChats = chats.filter((chat) => {
    const title = chat?.title || "";
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleClearAllChats = () => {
    Alert.alert(
      "Clear All Chats",
      "Are you sure you want to delete all conversations? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            clearAllChats();
            props.navigation.closeDrawer();
          },
        },
      ]
    );
  };

  const handleExportChats = () => {
    Alert.alert(
      "Export Chats",
      "Export feature coming soon! You'll be able to save your conversations.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: horizontalScale(16),
          paddingTop: verticalScale(16),
          paddingBottom: verticalScale(12),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.surface,
            borderRadius: moderateScale(24),
            paddingHorizontal: horizontalScale(16),
            paddingVertical: verticalScale(10),
          }}
        >
          <Ionicons
            name="search-outline"
            size={moderateScale(20)}
            color={theme.mutedText}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={theme.mutedText}
            style={{
              flex: 1,
              marginLeft: horizontalScale(8),
              color: theme.text,
              fontSize: moderateScale(16),
            }}
          />
        </View>
      </View>

      {/* Chat List */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          paddingTop: 0,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* New Chat Button */}
        <Pressable
          onPress={() => {
            addChat();
            props.navigation.closeDrawer();
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: verticalScale(14),
            paddingHorizontal: horizontalScale(16),
            backgroundColor: pressed ? theme.surface : "transparent",
          })}
        >
          <Ionicons
            name="create-outline"
            size={moderateScale(22)}
            color={theme.text}
          />
          <Text
            style={{
              color: theme.text,
              fontSize: moderateScale(16),
              marginLeft: horizontalScale(16),
            }}
          >
            New chat
          </Text>
        </Pressable>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.border,
            marginVertical: verticalScale(8),
          }}
        />

        {/* Chat List */}
        {filteredChats.map((item) => {
          const isActive = item.id === activeChat;

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                setActiveChat(item.id);
                props.navigation.closeDrawer();
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: verticalScale(14),
                paddingHorizontal: horizontalScale(16),
                backgroundColor: isActive
                  ? theme.surface
                  : pressed
                  ? theme.surface + "50"
                  : "transparent",
              })}
            >
              <Ionicons
                name="chatbubble-outline"
                size={moderateScale(20)}
                color={theme.mutedText}
              />
              <Text
                style={{
                  flex: 1,
                  color: theme.text,
                  fontSize: moderateScale(15),
                  marginLeft: horizontalScale(16),
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item?.title || "Untitled Chat"}
              </Text>

              {/* Delete Button */}
              {isActive && chats.length > 1 && (
                <Pressable
                  onPress={() => deleteChat(item.id)}
                  style={({ pressed }) => ({
                    padding: horizontalScale(4),
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Ionicons
                    name="trash-outline"
                    size={moderateScale(18)}
                    color={theme.mutedText}
                  />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </DrawerContentScrollView>

      {/* Settings Section at Bottom */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        {/* Settings Toggle */}
        <Pressable
          onPress={() => setShowSettings(!showSettings)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: verticalScale(14),
            paddingHorizontal: horizontalScale(16),
            backgroundColor: pressed ? theme.surface : "transparent",
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="settings-outline"
              size={moderateScale(22)}
              color={theme.text}
            />
            <Text
              style={{
                color: theme.text,
                fontSize: moderateScale(16),
                marginLeft: horizontalScale(16),
                fontWeight: "600",
              }}
            >
              Settings
            </Text>
          </View>
          <Ionicons
            name={showSettings ? "chevron-up" : "chevron-down"}
            size={moderateScale(20)}
            color={theme.mutedText}
          />
        </Pressable>

        {/* Settings Panel */}
        {showSettings && (
          <View
            style={{
              backgroundColor: theme.surface,
              paddingVertical: verticalScale(8),
            }}
          >
            {/* Dark Mode Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: verticalScale(12),
                paddingHorizontal: horizontalScale(16),
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={mode === "dark" ? "moon" : "sunny"}
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
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={mode === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: "#767577", true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginHorizontal: horizontalScale(16),
              }}
            />

            {/* Clear All Chats */}
            <Pressable
              onPress={handleClearAllChats}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: verticalScale(12),
                paddingHorizontal: horizontalScale(16),
                backgroundColor: pressed ? theme.background : "transparent",
              })}
            >
              <Ionicons
                name="trash-outline"
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
                Clear All Chats
              </Text>
            </Pressable>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginHorizontal: horizontalScale(16),
              }}
            />

            {/* Export Chats */}
            <Pressable
              onPress={handleExportChats}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: verticalScale(12),
                paddingHorizontal: horizontalScale(16),
                backgroundColor: pressed ? theme.background : "transparent",
              })}
            >
              <Ionicons
                name="download-outline"
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
                Export Chats
              </Text>
            </Pressable>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginHorizontal: horizontalScale(16),
              }}
            />

            {/* App Version */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: verticalScale(12),
                paddingHorizontal: horizontalScale(16),
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={moderateScale(20)}
                color={theme.mutedText}
              />
              <Text
                style={{
                  color: theme.mutedText,
                  fontSize: moderateScale(14),
                  marginLeft: horizontalScale(12),
                }}
              >
                Version 1.0.0
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}