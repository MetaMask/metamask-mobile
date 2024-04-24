import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

interface NotificationContentProps {
  title: string;
  description?: {
    asset?: {
      symbol?: string;
      name?: string;
    };
    text?: string;
  };
  createdAt: string;
  value: string;
  styles: StyleSheet.NamedStyles<any>;
}

function NotificationContent({
  title,
  description,
  createdAt,
  value,
  styles,
}: NotificationContentProps) {
  const useRenderTwoPartsTitles = useCallback(() => {
    const parts = title?.toLowerCase().includes('sent')
      ? title?.split(/(.*?to)/g)
      : title?.toLowerCase().includes('received')
      ? title?.split(/(.*?from)/g)
      : [];

    if (parts.length > 1) {
      return (
        <Text color={TextColor.Alternative} variant={TextVariant.BodySM}>
          {parts[1]}
          <Text variant={TextVariant.BodySM} color={TextColor.Info}>
            {parts[2]}
          </Text>
        </Text>
      );
    }

    return (
      <Text color={TextColor.Alternative} variant={TextVariant.BodySM}>
        {title}
      </Text>
    );
  }, [title]);

  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowInsider}>
        {useRenderTwoPartsTitles()}
        <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
          {createdAt}
        </Text>
      </View>
      <View style={styles.rowInsider}>
        <Text style={styles.textBox} variant={TextVariant.BodyMD}>
          {description?.asset?.name || description?.text}
        </Text>
        <Text variant={TextVariant.BodyMD}>{value}</Text>
      </View>
    </View>
  );
}

export default NotificationContent;
