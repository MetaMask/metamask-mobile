import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './SpendingLimitProgress.styles';

export interface SpendingLimitProgressProps {
  currentAmount: string;
  limitAmount: string;
  currency: string;
  onPress?: () => void;
  showWarning?: boolean;
  onSetNewLimit?: () => void;
  onDismiss?: () => void;
}

const SpendingLimitProgress: React.FC<SpendingLimitProgressProps> = ({
  currentAmount,
  limitAmount,
  currency,
  onPress,
  showWarning = false,
  onSetNewLimit,
  onDismiss,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const current = parseFloat(currentAmount) || 0;
  const limit = parseFloat(limitAmount) || 1;
  const progress = Math.min(current / limit, 1);
  const isNearLimit = progress >= 0.8;

  if (showWarning && isNearLimit) {
    return (
      <View style={styles.warningContainer}>
        <View style={styles.warningBanner}>
          <View style={styles.warningContent}>
            <Text variant={TextVariant.BodySM} style={styles.warningText}>
              {strings('card.card_home.spending_limit_warning')}
            </Text>
            <View style={styles.warningButtons}>
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.warningButton}
              >
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.warningButtonText}
                >
                  {strings('card_spending_limit.dismiss')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSetNewLimit}
                style={styles.warningButton}
              >
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.warningButtonText}
                >
                  {strings('card_spending_limit.set_new_limit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <Text variant={TextVariant.BodyMDMedium} style={styles.title}>
          Spending Limit
        </Text>
        <Text variant={TextVariant.BodySM} style={styles.amount}>
          {currentAmount}/{limitAmount} {currency}
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` },
              isNearLimit && styles.progressFillWarning,
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SpendingLimitProgress;
