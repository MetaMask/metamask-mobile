import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface PerpsAmountDisplayProps {
  amount: string;
  showWarning?: boolean;
  warningMessage?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  isActive?: boolean;
  label?: string;
  showTokenAmount?: boolean;
  tokenAmount?: string;
  tokenSymbol?: string;
  showMaxAmount?: boolean;
  hasError?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'tradeSheet';
  onDisplayToggle?: () => void;
  displayToggleAccessibilityLabel?: string;
  displayToggleTestID?: string;
  /**
   * Custom glyph for the `tradeSheet` fiat/token toggle. When omitted the
   * toggle is the MMDS `ButtonIcon` with `IconName.SwapVertical`; callers
   * whose design uses a glyph MMDS does not publish pass their own.
   */
  displayToggleIcon?: React.ReactNode;
}

const PerpsAmountDisplay: React.FC<PerpsAmountDisplayProps> = ({
  amount,
  showWarning = false,
  warningMessage = strings('perps.deposit.no_funds_available'),
  onPress,
  accessibilityLabel,
  isActive = false,
  label,
  showTokenAmount = false,
  tokenAmount,
  tokenSymbol,
  showMaxAmount = true,
  hasError = false,
  isLoading = false,
  variant = 'default',
  onDisplayToggle,
  displayToggleAccessibilityLabel,
  displayToggleTestID,
  displayToggleIcon,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();
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
  const fiatDisplayValue = amount
    ? formatPerpsFiat(amount, { ranges: PRICE_RANGES_MINIMAL_VIEW })
    : PERPS_CONSTANTS.ZeroAmountDisplay;
  const tokenDisplayValue =
    tokenAmount && tokenSymbol
      ? `${formatPositionSize(tokenAmount)} ${getPerpsDisplaySymbol(
          tokenSymbol,
        )}`
      : undefined;

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

  if (variant === 'tradeSheet') {
    const primaryDisplayValue =
      showTokenAmount && tokenDisplayValue
        ? tokenDisplayValue
        : fiatDisplayValue;
    const secondaryDisplayValue = showTokenAmount
      ? fiatDisplayValue
      : tokenDisplayValue;

    const primaryAmount = (
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {isLoading ? (
          <Skeleton width={80} height={40} />
        ) : (
          <Text
            testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
            variant={TextVariant.DisplayLg}
            color={hasError ? TextColor.ErrorDefault : TextColor.TextDefault}
          >
            {primaryDisplayValue}
          </Text>
        )}
        {isActive ? (
          <Animated.View
            testID="cursor"
            style={[
              styles.cursor,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        ) : null}
      </Box>
    );

    return (
      <Box
        alignItems={BoxAlignItems.Center}
        gap={2}
        testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
      >
        {onPress ? (
          <TouchableOpacity
            testID={PerpsAmountDisplaySelectorsIDs.TOUCHABLE}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {primaryAmount}
          </TouchableOpacity>
        ) : (
          primaryAmount
        )}
        {secondaryDisplayValue ? (
          <Box
            accessible={false}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            gap={2}
          >
            {/* Mirrors the toggle's width so the value stays optically centered. */}
            {onDisplayToggle ? (
              <Box accessible={false} twClassName="h-6 w-6" />
            ) : null}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {secondaryDisplayValue}
            </Text>
            {onDisplayToggle && displayToggleIcon ? (
              // Mirrors MMDS `ButtonIcon` (Sm, Filled) around a caller-supplied
              // glyph that MMDS does not publish under IconName.
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={displayToggleAccessibilityLabel}
                testID={displayToggleTestID}
                onPress={onDisplayToggle}
                hitSlop={8}
                style={({ pressed }) =>
                  tw.style(
                    'h-6 w-6 items-center justify-center rounded-full',
                    pressed ? 'bg-muted-pressed' : 'bg-muted',
                  )
                }
              >
                {displayToggleIcon}
              </Pressable>
            ) : null}
            {onDisplayToggle && !displayToggleIcon ? (
              <ButtonIcon
                iconName={IconName.SwapVertical}
                size={ButtonIconSize.Sm}
                variant={ButtonIconVariant.Filled}
                accessibilityLabel={displayToggleAccessibilityLabel}
                testID={displayToggleTestID}
                onPress={onDisplayToggle}
              />
            ) : null}
          </Box>
        ) : null}
        {showWarning ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.WarningDefault}
            style={styles.warning}
          >
            {warningMessage}
          </Text>
        ) : null}
      </Box>
    );
  }

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
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
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
