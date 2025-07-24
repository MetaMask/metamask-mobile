import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, Text as RNText } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { formatPrice } from '../../utils/formatUtils';
import { PerpsAmountDisplaySelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import createStyles from './PerpsAmountDisplay.styles';

interface PerpsAmountDisplayProps {
  amount: string;
  maxAmount: number;
  showWarning?: boolean;
  warningMessage?: string;
  onPress?: () => void;
  isActive?: boolean;
}

const PerpsAmountDisplay: React.FC<PerpsAmountDisplayProps> = ({
  amount,
  maxAmount,
  showWarning = false,
  warningMessage = 'No funds available. Please deposit first.',
  onPress,
  isActive = false,
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

  const content = (
    <View
      style={styles.container}
      testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
    >
      <View style={styles.amountRow}>
        <RNText
          style={[styles.amountValue, isActive && styles.amountValueActive]}
        >
          {amount ? formatPrice(amount, { minimumDecimals: 0 }) : '$0'}
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
