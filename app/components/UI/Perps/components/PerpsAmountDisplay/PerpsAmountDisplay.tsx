import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import { formatPrice } from '../../utils/formatUtils';

interface PerpsAmountDisplayProps {
  amount: string;
  maxAmount: number;
  showWarning?: boolean;
  warningMessage?: string;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    amountValue: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      lineHeight: 56,
    },
    maxAmount: {
      marginTop: 4,
    },
    warning: {
      marginTop: 12,
    },
  });

const PerpsAmountDisplay: React.FC<PerpsAmountDisplayProps> = ({
  amount,
  maxAmount,
  showWarning = false,
  warningMessage = 'No funds available. Please deposit first.',
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.amountValue}>
        {amount ? formatPrice(amount) : '$0'}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.maxAmount}
      >
        {formatPrice(maxAmount)} max
      </Text>
      {showWarning && (
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Warning}
          style={styles.warning}
        >
          {warningMessage}
        </Text>
      )}
    </View>
  );
};

export default PerpsAmountDisplay;
