import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { styles } from './styles';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

interface EmptyProps {
  testID?: string;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Empty = ({ testID, title, message, children, style }: EmptyProps) => (
  <View style={[styles.wrapper, style]} testID={testID}>
    <Icon
      name={IconName.Notification}
      size={IconSize.Xl}
      color={IconColor.IconDefault}
      style={styles.text}
    />
    <Text style={styles.text} variant={TextVariant.HeadingMd}>
      {title ?? strings('notifications.empty.title')}
    </Text>
    <Text style={styles.text} variant={TextVariant.BodyMd}>
      {message ?? strings('notifications.empty.message')}
    </Text>
    {children}
  </View>
);

export default Empty;
