import React, { useEffect, useRef } from 'react';
import { Animated, Text as RNText, TouchableOpacity, View } from 'react-native';
import { PerpsAmountDisplaySelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { formatPrice, formatPositionSize } from '../../utils/formatUtils';
import createStyles from './PerpsAmountDisplay.styles';

interface PerpsAmountDisplayProps {
  amount: string;
  showWarning?: boolean;
  warningMessage?: string;
  onPress?: () => void;
  isActive?: boolean;
  label?: string;
  showTokenAmount?: boolean;
  tokenAmount?: string;
  tokenSymbol?: string;
  showMaxAmount?: boolean;
}

const PerpsAmountDisplay: React.FC<PerpsAmountDisplayProps> = ({
  amount,
  showWarning = false,
  warningMessage = 'No funds available. Please deposit first.',
  onPress,
  isActive = false,
  label,
  showTokenAmount = false,
  tokenAmount,
  tokenSymbol,
  showMaxAmount = true,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Start blinking animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Stop animation and hide cursor
      fadeAnim.setValue(0);
    }
  }, [isActive, fadeAnim]);

  const isAmountExceedingMax = parseFloat(amount || '0') > maxAmount;

  const content = (
    <View
      style={styles.container}
      testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
    >
      {label && (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.label}
        >
          {label}
        </Text>
      )}
      <View style={styles.amountRow}>
        <RNText
          testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
          style={[
            showTokenAmount && tokenAmount && tokenSymbol
              ? styles.amountValueToken
              : styles.amountValue,
            isActive && styles.amountValueActive,
            isAmountExceedingMax && styles.amountValueError,
          ]}
        >
          {showTokenAmount && tokenAmount && tokenSymbol
            ? `${formatPositionSize(tokenAmount)} ${tokenSymbol}`
            : amount
            ? formatPrice(amount, { minimumDecimals: 0, maximumDecimals: 2 })
            : '$0'}
        </RNText>
        {isActive && (
          <Animated.View
            testID="cursor"
            style={[
              styles.cursor,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        )}
      </View>
      {/* Display token amount equivalent for current input */}
      {showMaxAmount && tokenAmount && tokenSymbol && (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.maxAmount}
          testID={PerpsAmountDisplaySelectorsIDs.MAX_LABEL}
        >
          {formatPositionSize(tokenAmount)} {tokenSymbol}
        </Text>
      )}
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

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default PerpsAmountDisplay;
