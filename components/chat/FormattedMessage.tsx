// components/chat/FormattedMessage.tsx
import React from "react";
import { Text, View } from "react-native";
import { moderateScale, verticalScale } from "@/utils/metrics";

interface FormattedMessageProps {
  text: string;
  color: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ text, color }) => {
  // Parse and format the message
  const parseMessage = (message: string) => {
    const lines = message.split('\n');
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

  return <View>{parseMessage(text)}</View>;
};