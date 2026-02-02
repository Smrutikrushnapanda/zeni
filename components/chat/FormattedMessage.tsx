// components/chat/FormattedMessage.tsx
import React, { useState } from "react";
import { Text, View, Pressable, ScrollView, Alert, Platform } from "react-native";
import { moderateScale, verticalScale, horizontalScale } from "@/utils/metrics";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { useThemeStore } from "@/store/theme.store";

interface FormattedMessageProps {
  text: string;
  color: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, color }) => {
  const { theme, mode } = useThemeStore();

  // Parse message into text and code blocks
  const parseMessage = (message: string) => {
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    
    // Match code blocks: ```language\ncode\n```
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(message)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = message.substring(lastIndex, match.index);
        if (textContent.trim()) {
          parts.push({ type: "text", content: textContent });
        }
      }

      // Add code block
      parts.push({
        type: "code",
        content: match[2].trim(),
        language: match[1] || "code",
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.length) {
      const textContent = message.substring(lastIndex);
      if (textContent.trim()) {
        parts.push({ type: "text", content: textContent });
      }
    }

    // If no code blocks found, return the whole message as text
    if (parts.length === 0) {
      parts.push({ type: "text", content: message });
    }

    return parts;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string = "Text") => {
    await Clipboard.setStringAsync(text);
    Alert.alert("✅ Copied!", `${label} copied to clipboard`);
  };

  // Render code block with copy button
  const CodeBlock = ({ code, language }: { code: string; language: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      await copyToClipboard(code, "Code");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <View
        style={{
          backgroundColor: mode === "dark" ? "#1E1E1E" : "#F6F8FA",
          borderRadius: moderateScale(8),
          overflow: "hidden",
          marginVertical: verticalScale(8),
          borderWidth: 1,
          borderColor: mode === "dark" ? "#3D3D3D" : "#E1E4E8",
        }}
      >
        {/* Code Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: horizontalScale(12),
            paddingVertical: verticalScale(8),
            backgroundColor: mode === "dark" ? "#2D2D2D" : "#E1E4E8",
          }}
        >
          <Text
            style={{
              fontSize: moderateScale(12),
              fontWeight: "600",
              color: mode === "dark" ? "#C9D1D9" : "#586069",
              textTransform: "lowercase",
            }}
          >
            {language}
          </Text>
          
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: horizontalScale(4),
              paddingHorizontal: horizontalScale(8),
              paddingVertical: verticalScale(4),
              borderRadius: moderateScale(4),
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={moderateScale(16)}
              color={mode === "dark" ? "#C9D1D9" : "#586069"}
            />
            <Text
              style={{
                fontSize: moderateScale(12),
                fontWeight: "500",
                color: mode === "dark" ? "#C9D1D9" : "#586069",
              }}
            >
              {copied ? "Copied!" : "Copy code"}
            </Text>
          </Pressable>
        </View>

        {/* Code Content */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: verticalScale(300) }}
        >
          <Text
            style={{
              fontSize: moderateScale(13),
              lineHeight: verticalScale(20),
              padding: moderateScale(12),
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              color: mode === "dark" ? "#C9D1D9" : "#24292E",
            }}
          >
            {code}
          </Text>
        </ScrollView>
      </View>
    );
  };

  // Parse and format regular text
  const formatTextContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    lines.forEach((line, index) => {
      // Empty line - add spacing
      if (line.trim() === '') {
        elements.push(
          <View key={`space-${key++}`} style={{ height: verticalScale(8) }} />
        );
        return;
      }

      // Bold headings (text with ** or ending with :)
      if (line.match(/^\*\*(.+)\*\*$/) || line.match(/^(.+):$/)) {
        const cleanText = line.replace(/\*\*/g, '').trim();
        elements.push(
          <Text
            key={`heading-${key++}`}
            style={{
              color,
              fontSize: moderateScale(17),
              fontWeight: '700',
              marginTop: verticalScale(8),
              marginBottom: verticalScale(4),
              lineHeight: verticalScale(24),
            }}
          >
            {cleanText}
          </Text>
        );
        return;
      }

      // Bullet points
      if (line.match(/^[•●▪︎]\s/)) {
        const text = line.replace(/^[•●▪︎]\s/, '').trim();
        elements.push(
          <View
            key={`bullet-${key++}`}
            style={{
              flexDirection: 'row',
              marginLeft: moderateScale(8),
              marginVertical: verticalScale(2),
            }}
          >
            <Text
              style={{
                color,
                fontSize: moderateScale(16),
                marginRight: moderateScale(8),
                lineHeight: verticalScale(24),
              }}
            >
              •
            </Text>
            <Text
              style={{
                flex: 1,
                color,
                fontSize: moderateScale(16),
                lineHeight: verticalScale(24),
              }}
            >
              {text}
            </Text>
          </View>
        );
        return;
      }

      // Numbered lists
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          const [, number, text] = match;
          elements.push(
            <View
              key={`number-${key++}`}
              style={{
                flexDirection: 'row',
                marginLeft: moderateScale(8),
                marginVertical: verticalScale(2),
              }}
            >
              <Text
                style={{
                  color,
                  fontSize: moderateScale(16),
                  fontWeight: '600',
                  marginRight: moderateScale(8),
                  lineHeight: verticalScale(24),
                  minWidth: moderateScale(24),
                }}
              >
                {number}.
              </Text>
              <Text
                style={{
                  flex: 1,
                  color,
                  fontSize: moderateScale(16),
                  lineHeight: verticalScale(24),
                }}
              >
                {text.trim()}
              </Text>
            </View>
          );
          return;
        }
      }

      // Bold text inline (**text**)
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const textElements = parts.map((part, i) => {
        if (part.match(/^\*\*[^*]+\*\*$/)) {
          return (
            <Text
              key={`bold-${key++}-${i}`}
              style={{ fontWeight: '700' }}
            >
              {part.replace(/\*\*/g, '')}
            </Text>
          );
        }
        return part;
      });

      // Regular paragraph
      elements.push(
        <Text
          key={`text-${key++}`}
          style={{
            color,
            fontSize: moderateScale(16),
            lineHeight: verticalScale(24),
            marginVertical: verticalScale(2),
          }}
        >
          {textElements}
        </Text>
      );
    });

    return elements;
  };

  const parts = parseMessage(text);

  return (
    <View>
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <CodeBlock
              key={`code-${index}`}
              code={part.content}
              language={part.language || "code"}
            />
          );
        } else {
          return (
            <View key={`text-${index}`}>
              {formatTextContent(part.content)}
            </View>
          );
        }
      })}
    </View>
  );
};