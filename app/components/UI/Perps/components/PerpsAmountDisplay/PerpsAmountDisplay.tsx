import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from './PerpsAmountDisplay.styles';

interface PerpsAmountDisplayProps {
  amount: string;
  currency: string;
  testID?: string;
  showCursor?: boolean;
  fiatEquivalent?: string;
  showFiatEquivalent?: boolean;
}

const PerpsAmountDisplay: React.FC<PerpsAmountDisplayProps> = ({
  amount,
  currency,
  testID = 'perps-amount-display',
  showCursor = true,
  fiatEquivalent,
  showFiatEquivalent = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showCursor) return;

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();

    return () => {
      blinkAnimation.stop();
    };
  }, [cursorOpacity, showCursor]);

  // Format amount with thousand separators
  const formatAmount = (value: string) => {
    if (!value || value === '0') return '0';
    const numericValue = parseFloat(value);
    return numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const displayAmount = amount === '0' ? '0' : formatAmount(amount);
  const shouldShowCursor = showCursor && amount === '0';

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.amountRow}>
        <Text
          variant={TextVariant.DisplayMD}
          color={TextColor.Default}
          style={styles.amountText}
          testID={`${testID}-amount`}
        >
          {displayAmount}
        </Text>
        {shouldShowCursor && (
          <Animated.View
            style={[styles.cursor, { opacity: cursorOpacity }]}
            testID={`${testID}-cursor`}
          />
        )}
      </View>

      <Text
        variant={TextVariant.BodyLGMedium}
        color={TextColor.Muted}
        style={styles.fiatText}
        testID={`${testID}-currency`}
      >
        {currency}
      </Text>

      {showFiatEquivalent && fiatEquivalent && (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Muted}
          style={styles.fiatText}
          testID={`${testID}-fiat`}
        >
          ≈ ${fiatEquivalent}
        </Text>
      )}
    </View>
  );
};

export default PerpsAmountDisplay;
