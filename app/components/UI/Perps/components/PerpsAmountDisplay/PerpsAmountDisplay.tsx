import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { PerpsAmountDisplaySelectorsIDs } from '../../Perps.testIds';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPerpsFiat,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import createStyles from './PerpsAmountDisplay.styles';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';

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
    return PERPS_CONSTANTS.ZERO_AMOUNT_DISPLAY;
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
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.label}
        >
          {label}
        </Text>
      )}
      <View style={styles.amountRow}>
        {/* Text only takes 1 arg */}
        {isLoading ? (
          <SkeletonPlaceholder>
            <SkeletonPlaceholder.Item width={80} height={20} borderRadius={4} />
          </SkeletonPlaceholder>
        ) : (
          <Text
            testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
            color={hasError ? TextColor.Error : TextColor.Default}
            variant={TextVariant.BodyMDBold}
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
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.maxAmount}
          testID={PerpsAmountDisplaySelectorsIDs.MAX_LABEL}
        >
          {formatPositionSize(tokenAmount)} {getPerpsDisplaySymbol(tokenSymbol)}
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
