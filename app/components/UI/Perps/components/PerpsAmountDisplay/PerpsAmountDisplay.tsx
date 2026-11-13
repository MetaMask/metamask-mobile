import React from 'react';
import {
  Animated,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { useReducedMotion as useNativeReducedMotion } from 'react-native-reanimated';

// Some existing Jest suites provide partial Reanimated mocks.
const useReducedMotion = useNativeReducedMotion ?? (() => false);
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useBlinkingCursor } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
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
  FontFamily,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

/**
 * Formats a trade-sheet coin amount.
 *
 * An in-progress keypad draft is shown as typed. `formatPositionSize` rounds
 * amounts at or above 1 to two decimals, which would change the digits still
 * being entered. Idle amounts keep that display formatting.
 */
const formatTradeSheetTokenAmount = (
  tokenAmount: string,
  preserveExactAmount: boolean,
): string => {
  if (preserveExactAmount) {
    return tokenAmount;
  }
  if (tokenAmount.endsWith('.')) {
    return `${formatPositionSize(tokenAmount.slice(0, -1) || '0')}.`;
  }
  return formatPositionSize(tokenAmount);
};

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
  twClassName?: string;
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
  twClassName,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const styles = createStyles(colors);
  const reduceMotion = useReducedMotion();
  const cursorOpacity = useBlinkingCursor(isActive && !reduceMotion);

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

  const cursorStyle = [
    styles.cursor,
    reduceMotion ? null : { opacity: cursorOpacity },
  ];

  if (variant === 'tradeSheet') {
    const isTokenPrimary = Boolean(
      showTokenAmount && tokenAmount && tokenSymbol,
    );
    // The unit is rendered separately so the input cursor sits after the
    // number rather than after the symbol.
    const primaryDisplayValue =
      isTokenPrimary && tokenAmount
        ? formatTradeSheetTokenAmount(tokenAmount, isActive)
        : fiatDisplayValue;
    const primaryDisplayUnit =
      isTokenPrimary && tokenSymbol
        ? getPerpsDisplaySymbol(tokenSymbol)
        : undefined;
    const secondaryDisplayValue = showTokenAmount
      ? fiatDisplayValue
      : tokenDisplayValue;
    const primaryColor = hasError
      ? TextColor.ErrorDefault
      : TextColor.TextDefault;

    const primaryAmount = (
      <Box
        accessible={false}
        testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_ROW}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {isLoading ? (
          <Skeleton width={80} height={40} />
        ) : (
          <Text
            testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
            variant={TextVariant.AmountDisplayLg}
            fontFamily={FontFamily.Hero}
            color={primaryColor}
            style={styles.tradeSheetAmount}
          >
            {primaryDisplayValue}
          </Text>
        )}
        {isActive ? (
          <Animated.View testID="cursor" style={cursorStyle} />
        ) : null}
        {!isLoading && primaryDisplayUnit ? (
          <Text
            testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_UNIT_LABEL}
            variant={TextVariant.AmountDisplayLg}
            fontFamily={FontFamily.Hero}
            color={primaryColor}
            style={styles.tradeSheetAmount}
          >
            {` ${primaryDisplayUnit}`}
          </Text>
        ) : null}
      </Box>
    );

    return (
      <Box
        alignItems={BoxAlignItems.Center}
        gap={3}
        testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
        twClassName={twClassName}
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
            {onDisplayToggle && displayToggleIcon ? (
              // Mirrors MMDS `ButtonIcon` (Sm, Filled) around a caller-supplied
              // glyph that MMDS does not publish under IconName. The secondary
              // amount sits in the same control so the value and toggle read
              // as one button.
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={displayToggleAccessibilityLabel}
                testID={displayToggleTestID}
                onPress={onDisplayToggle}
                hitSlop={8}
                style={({ pressed }) =>
                  tw.style(
                    'flex-row items-center gap-0.5 rounded-full py-0.5 pl-2 pr-1.5',
                    pressed ? 'bg-muted-pressed' : 'bg-muted',
                  )
                }
              >
                <Text
                  accessible={false}
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Medium}
                >
                  {secondaryDisplayValue}
                </Text>
                {displayToggleIcon}
              </Pressable>
            ) : (
              <>
                {/* Mirrors the toggle's width so the value stays optically centered. */}
                {onDisplayToggle ? (
                  <Box accessible={false} twClassName="h-6 w-6" />
                ) : null}
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  {secondaryDisplayValue}
                </Text>
                {onDisplayToggle ? (
                  <ButtonIcon
                    iconName={IconName.SwapVertical}
                    size={ButtonIconSize.Sm}
                    variant={ButtonIconVariant.Filled}
                    accessibilityLabel={displayToggleAccessibilityLabel}
                    testID={displayToggleTestID}
                    onPress={onDisplayToggle}
                  />
                ) : null}
              </>
            )}
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
      style={[styles.container, tw.style(twClassName)]}
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
        {isActive && <Animated.View testID="cursor" style={cursorStyle} />}
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
