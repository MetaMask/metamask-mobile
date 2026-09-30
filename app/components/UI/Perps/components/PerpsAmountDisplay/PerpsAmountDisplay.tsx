import React from 'react';
import { Platform, Pressable, TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { AnimatedAmountDisplay } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
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

  if (variant === 'tradeSheet') {
    const isTokenPrimary = Boolean(
      showTokenAmount && tokenAmount && tokenSymbol,
    );
    // The unit is rendered separately so the input cursor sits after the
    // number rather than after the symbol.
    const primaryDisplayValue =
      isTokenPrimary && tokenAmount
        ? formatPositionSize(tokenAmount)
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
      <AnimatedAmountDisplay
        amountTestID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
        color={primaryColor}
        cursor={isActive ? { testID: 'cursor', style: styles.cursor } : false}
        loading={isLoading}
        loadingContent={<Skeleton width={80} height={40} />}
        suffix={
          primaryDisplayUnit ? (
            <Text
              testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_UNIT_LABEL}
              variant={TextVariant.DisplayLg}
              color={primaryColor}
            >
              {` ${primaryDisplayUnit}`}
            </Text>
          ) : undefined
        }
        testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_ROW}
        value={primaryDisplayValue}
        variant={TextVariant.DisplayLg}
      />
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
      <AnimatedAmountDisplay
        amountTestID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
        color={hasError ? TextColor.ErrorDefault : TextColor.TextDefault}
        containerStyle={styles.amountRow}
        cursor={
          isActive
            ? {
                testID: 'cursor',
                style: styles.cursor,
              }
            : false
        }
        fontWeight={FontWeight.Bold}
        loading={isLoading}
        loadingContent={<Skeleton width={80} height={20} />}
        style={
          Platform.OS === 'android'
            ? styles.amountValueTokenAndroid
            : styles.amountValueToken
        }
        value={displayValue}
        variant={TextVariant.BodyMd}
      />
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
