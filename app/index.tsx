import ChatScreen from "@/app/screens/chat/ChatScreen";
import { useThemeStore } from "@/store/theme.store";
import { View } from "react-native";

export default function Index() {
  const { theme } = useThemeStore();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ChatScreen />
    </View>
  );
}
