import React from 'react';
import { TouchableOpacity, View } from 'react-native';

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
  /** Zero-based index of the current step (0 for Q1, 1 for Q2, 2 for Q3). Pass `null` to hide the dots (e.g. on the terminal warning screen). */
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

  return (
    <View>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          testID="scam-questionnaire-back"
          accessibilityRole="button"
          accessibilityLabel={strings('navigation.back')}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={colors.icon.default}
          />
        </TouchableOpacity>
        <Text variant={TextVariant.BodyMDBold} style={styles.headerTitle}>
          {strings('scam_questionnaire.header_title')}
        </Text>
        <View style={styles.headerSideSlot} />
      </View>
      {currentStep !== null && (
        <View
          style={styles.progressDots}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: totalSteps, now: currentStep + 1 }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};
