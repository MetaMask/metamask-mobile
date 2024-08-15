import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import createStyles from './NotificationsSettings.styles';

interface SessionHeaderProps {
  title: string;
  description: string;
  styles: ReturnType<typeof createStyles>;
}

const SessionHeader = ({ title, description, styles }: SessionHeaderProps) => (
  <>
    <View style={styles.switchElement}>
      <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
        {title}
      </Text>
    </View>
    <View style={styles.setting}>
      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
        {description}
      </Text>
    </View>
  </>
);

export default SessionHeader;
