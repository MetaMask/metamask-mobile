import React from 'react';
import { View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import styleSheet from './scam-questionnaire.styles';

export type CalloutVariant = 'info' | 'warn';

export interface EducationalCalloutProps {
  variant: CalloutVariant;
  title: string;
  body: string;
}

export const EducationalCallout: React.FC<EducationalCalloutProps> = ({
  variant,
  title,
  body,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  const isWarn = variant === 'warn';
  const iconName = isWarn ? IconName.Danger : IconName.Info;
  const iconColor = isWarn ? colors.error.default : colors.warning.default;

  return (
    <View
      style={isWarn ? styles.calloutWarn : styles.calloutInfo}
      testID={`scam-questionnaire-callout-${variant}`}
    >
      <View style={styles.calloutIcon}>
        <Icon name={iconName} size={IconSize.Md} color={iconColor} />
      </View>
      <View style={styles.calloutTextContainer}>
        <Text
          variant={TextVariant.BodyMDBold}
          style={isWarn ? styles.calloutTitleWarn : styles.calloutTitleInfo}
        >
          {title}
        </Text>
        <Text variant={TextVariant.BodySM} style={styles.calloutBody}>
          {body}
        </Text>
      </View>
    </View>
  );
};
