import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './scam-questionnaire.styles';

export interface SecurityCheckHeaderProps {
  /** Zero-based index of the current step. Pass `null` to hide progress (e.g. on the terminal warning screen). */
  currentStep: number | null;
  totalSteps: number;
  onBack: () => void;
}

export const SecurityCheckHeader: React.FC<SecurityCheckHeaderProps> = ({
  currentStep,
  totalSteps,
  onBack,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();

  // Animated progress bar — smooths between steps so the flow feels considered
  // rather than jumpy. Fills 1/N at start so step 1 doesn't read as 0% complete.
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const target = currentStep === null ? 1 : (currentStep + 1) / totalSteps;
    Animated.timing(progress, {
      toValue: target,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, progress]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          testID="scam-questionnaire-back"
          accessibilityRole="button"
          accessibilityLabel={strings('navigation.back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={colors.text.default}
          />
        </TouchableOpacity>
        <Text variant={TextVariant.BodyMDMedium} style={styles.headerTitle}>
          {strings('scam_questionnaire.header_title')}
        </Text>
        <View style={styles.headerSideSlot} />
      </View>
      {currentStep !== null && (
        <View
          style={styles.progressBarTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: totalSteps, now: currentStep + 1 }}
        >
          <Animated.View
            style={[styles.progressBarFill, { width: fillWidth }]}
          />
        </View>
      )}
    </View>
  );
};
