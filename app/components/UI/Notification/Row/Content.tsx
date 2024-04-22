import React from 'react';
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
  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowInsider}>
        <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
          {title}
        </Text>
        <Text color={TextColor.Muted} variant={TextVariant.BodySM}>
          {createdAt}
        </Text>
      </View>
      <View style={styles.rowInsider}>
        <Text style={styles.textBox} variant={TextVariant.BodyMD}>
          {description?.asset && description?.asset?.name}
        </Text>
        <Text variant={TextVariant.BodyMD}>{value}</Text>
      </View>
    </View>
  );
}

export default NotificationContent;
