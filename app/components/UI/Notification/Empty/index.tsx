import React from 'react';
import { View } from 'react-native';
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
const Empty = ({ testID }: { testID?: string }) => (
  <View style={styles.wrapper} testID={testID}>
    <Icon
      name={IconName.Notification}
      size={IconSize.Xl}
      color={IconColor.IconDefault}
      style={styles.text}
    />
    <Text style={styles.text} variant={TextVariant.HeadingMd}>
      {strings('notifications.empty.title')}
    </Text>
    <Text style={styles.text} variant={TextVariant.BodyMd}>
      {strings('notifications.empty.message')}
    </Text>
  </View>
);

export default Empty;
