import React, { useEffect, useRef } from 'react';
import { Animated, Platform, TouchableOpacity, View } from 'react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { PerpsAmountDisplaySelectorsIDs } from '../../Perps.testIds';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPerpsFiat,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import {
  PERPS_CONSTANTS,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';
import createStyles from './PerpsAmountDisplay.styles';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

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
  hasError?: boolean;
  isLoading?: boolean;
}

const PerpsAmountDisplay: React.FC<PerpsAmountDisplayProps> = ({
  amount,
  showWarning = false,
  warningMessage = strings('perps.deposit.no_funds_available'),
  onPress,
  isActive = false,
  label,
  showTokenAmount = false,
  tokenAmount,
  tokenSymbol,
  showMaxAmount = true,
  hasError = false,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate display value - extracted from nested ternary for clarity
  const displayValue = (() => {
    if (showTokenAmount && tokenAmount && tokenSymbol) {
      return `${formatPositionSize(tokenAmount)} ${getPerpsDisplaySymbol(tokenSymbol)}`;
    }
    if (amount) {
      return formatPerpsFiat(amount, { ranges: PRICE_RANGES_MINIMAL_VIEW });
    }
    return PERPS_CONSTANTS.ZeroAmountDisplay;
  })();

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
      {label && (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          style={styles.label}
        >
          {label}
        </Text>
      )}
      <View style={styles.amountRow}>
        {/* Text only takes 1 arg */}
        {isLoading ? (
          <Skeleton width={80} height={20} />
        ) : (
          <Text
            testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
            color={hasError ? TextColor.ErrorDefault : TextColor.TextDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            style={
              Platform.OS === 'android'
                ? styles.amountValueTokenAndroid
                : styles.amountValueToken
            }
          >
            {displayValue}
          </Text>
        )}
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
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          style={styles.maxAmount}
          testID={PerpsAmountDisplaySelectorsIDs.MAX_LABEL}
        >
          {formatPositionSize(tokenAmount)} {getPerpsDisplaySymbol(tokenSymbol)}
        </Text>
      )}
      {showWarning && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.WarningDefault}
          style={styles.warning}
        >
          {warningMessage}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={PerpsAmountDisplaySelectorsIDs.TOUCHABLE}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default PerpsAmountDisplay;
