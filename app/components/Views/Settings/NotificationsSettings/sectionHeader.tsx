import React from 'react';
import { View } from 'react-native';
import {
  FontWeight,
  TextColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import createStyles from './NotificationsSettings.styles';

interface SessionHeaderProps {
  title: string;
  description: string;
  styles: ReturnType<typeof createStyles>;
}

const SessionHeader = ({ title, description, styles }: SessionHeaderProps) => (
  <>
    <View style={styles.switchElement}>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
      >
        {title}
      </Text>
    </View>
    <View style={styles.setting}>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {description}
      </Text>
    </View>
  </>
);

export default SessionHeader;
