import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontFamily,
  FontWeight,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import {
  AnimatedAmountDisplay,
  getFontSizeForInputLength,
} from '../../../../component-library/components-temp/AnimatedAmountDisplay';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import useCurrency from '../../../Base/Keypad/useCurrency';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useTheme } from '../../../../util/theme';
import {
  formatCurrency,
  getCurrencySymbol,
} from '../../Bridge/utils/currencyUtils';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import type { QuickBuyAmountDisplayMode } from '../types';
import { formatTokenAmount } from '../../SocialFeed/utils/formatters';
import { strings } from '../../../../../locales/i18n';

interface QuickBuyAmountSectionProps {
  amountDisplayMode: QuickBuyAmountDisplayMode;
  /** Entered amount preformatted in the user's display currency (e.g. "$20", "20 €"). */
  fiatAmountLabel: string;
  /** Raw fiat amount string from the keypad (no currency symbol). */
  fiatAmount?: string;
  /** ISO currency code for symbol placement while editing. */
  currency?: string;
  destSymbol: string;
  /** Estimated amount received in the dest token from the quote. */
  estimatedReceiveAmount: string | undefined;
  isQuoteLoading: boolean;
  /** Highlights the entered amount when it exceeds the source balance. */
  hasInsufficientBalance?: boolean;
  /**
   * When true, the user is acting on an unpriced source token (sell mode only).
   * The headline switches to the entered source-token amount, the secondary
   * line shows the estimated destination amount, and the fiat/crypto toggle is
   * hidden because there's no fiat value to flip to.
   */
  isUnpricedSource?: boolean;
  /** Source-token amount the user has entered (unpriced path). */
  sourceCryptoAmount?: string;
  /** Source token symbol (unpriced path), e.g. "CAKE". */
  sourceSymbol?: string;
  /** Available source balance shown in Sell mode. */
  sourceBalanceDisplay?: string;
  /** When true, shows a blinking caret after the editable digits (keypad open). */
  showCursor?: boolean;
  // Custom-amount input is temporarily disabled (numpad removed). The slider is
  // the only input path for now, but these props remain on the interface so the
  // controller wiring is preserved for when the keyboard path is restored.
  hiddenInputRef?: React.RefObject<TextInput | null>;
  onAmountAreaPress?: () => void;
  onAmountChange?: (text: string) => void;
}

const INPUT_SIDE_MARGIN_CHARACTER_RESERVE = 2;
// Holds the row at the largest step so the shrinking scale for long amounts
// does not change the centered block's height.
const AMOUNT_ROW_STYLE = { minHeight: getFontSizeForInputLength(0) };

/** True when the currency symbol appears before the digits for this locale. */
function isCurrencySymbolPrefix(currency: string): boolean {
  const symbol = getCurrencySymbol(currency);
  if (!symbol) {
    return true;
  }
  const formatted = formatCurrency(1, currency);
  const digitIndex = formatted.search(/\d/);
  const symbolIndex = formatted.indexOf(symbol);
  if (digitIndex < 0 || symbolIndex < 0) {
    return true;
  }
  return symbolIndex < digitIndex;
}

/**
 * Show keypad-internal amounts (dot decimal) with the currency's locale
 * separator so editing matches the closed-keypad `formatCurrency` headline.
 */
export function formatAmountDigitsForDisplay(
  amount: string,
  decimalSeparator: string | null | undefined,
): string {
  const digits = amount || '0';
  if (!decimalSeparator || decimalSeparator === '.' || !digits.includes('.')) {
    return digits;
  }
  return digits.replace('.', decimalSeparator);
}

const QuickBuyAmountSection: React.FC<QuickBuyAmountSectionProps> = ({
  amountDisplayMode,
  fiatAmountLabel,
  fiatAmount = '',
  currency,
  destSymbol,
  estimatedReceiveAmount,
  isQuoteLoading,
  hasInsufficientBalance = false,
  isUnpricedSource = false,
  sourceCryptoAmount,
  sourceSymbol,
  sourceBalanceDisplay,
  showCursor = false,
  onAmountAreaPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  // Glyph motion is local. LOW hardware skips it. An unknown network stays on
  // the product default and is not treated as offline.
  const animateAmount = hardwareTier !== 'LOW' || networkTier === null;
  // Same currency → decimal mapping as QuickBuyKeypad so the headline separator
  // matches what the keypad is typing.
  const { decimalSeparator } = useCurrency(
    isUnpricedSource ? 'native' : currency,
  );

  const cryptoAmountLabel = estimatedReceiveAmount
    ? `≈ ${formatTokenAmount(parseFloat(estimatedReceiveAmount))} ${destSymbol}`
    : `0 ${destSymbol}`;

  let primaryLabel: string;
  let secondaryLabel: string;

  if (isUnpricedSource) {
    // Source has no fiat rate: the headline must be the source token amount
    // the user entered (slider or keyboard). The secondary line previews the
    // estimated destination amount, which only appears once a quote lands.
    const sourceLabel =
      `${sourceCryptoAmount || '0'} ${sourceSymbol ?? ''}`.trim();
    primaryLabel = sourceLabel;
    secondaryLabel = cryptoAmountLabel;
  } else {
    const isCryptoPrimary = amountDisplayMode === 'crypto';
    primaryLabel = isCryptoPrimary ? cryptoAmountLabel : fiatAmountLabel;
    secondaryLabel = isCryptoPrimary ? fiatAmountLabel : cryptoAmountLabel;
  }
  if (sourceBalanceDisplay) {
    secondaryLabel = strings('social_leaderboard.quick_buy.available_balance', {
      amount: sourceBalanceDisplay,
    });
  }
  // Sell passes its balance line and keeps it when over balance; only Buy can add funds.
  if (hasInsufficientBalance && !sourceBalanceDisplay) {
    secondaryLabel = strings('social_leaderboard.quick_buy.add_funds');
  }
  const amountColor = hasInsufficientBalance
    ? TextColor.ErrorDefault
    : TextColor.TextDefault;

  let amountPrefix = '';
  let amountValue = primaryLabel;
  let amountSuffix = '';
  if (showCursor) {
    amountValue = formatAmountDigitsForDisplay(
      isUnpricedSource ? sourceCryptoAmount || '0' : fiatAmount || '0',
      decimalSeparator,
    );
    if (isUnpricedSource) {
      amountSuffix = sourceSymbol ? ` ${sourceSymbol}` : '';
    } else if (currency) {
      const symbol = getCurrencySymbol(currency);
      if (symbol && isCurrencySymbolPrefix(currency)) {
        amountPrefix = symbol;
      } else if (symbol) {
        amountSuffix = ` ${symbol}`;
      }
    }
  }
  const amountFontSize = getFontSizeForInputLength(
    amountPrefix.length +
      amountValue.length +
      amountSuffix.length +
      INPUT_SIDE_MARGIN_CHARACTER_RESERVE,
  );
  const amountTextStyle = {
    fontSize: amountFontSize,
    lineHeight: amountFontSize,
  };
  // Same caret treatment as the confirmation custom amount: muted, 95% of the
  // font size, and a slight upward shift so it sits with the glyphs.
  const cursorStyle = {
    width: 1,
    height: Math.round(amountFontSize * 0.95),
    backgroundColor: colors.text.muted,
    transform: [{ translateY: Math.round(amountFontSize * -0.04) }],
  };

  const content = (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="px-4 pt-6 pb-4"
      testID={QuickBuySheetSelectorsIDs.AMOUNT_AREA}
    >
      <AnimatedAmountDisplay
        amountTestID="quick-buy-amount-value"
        animated={animateAmount}
        color={amountColor}
        containerStyle={AMOUNT_ROW_STYLE}
        cursor={
          showCursor
            ? {
                animated: animateAmount,
                style: cursorStyle,
                testID: 'quick-buy-amount-cursor',
              }
            : false
        }
        fontFamily={FontFamily.Hero}
        prefix={amountPrefix || undefined}
        style={amountTextStyle}
        suffix={amountSuffix || undefined}
        suffixColor={amountColor}
        suffixStyle={amountTextStyle}
        testID="quick-buy-amount-row"
        value={amountValue}
        variant={TextVariant.DisplayMd}
      />

      <Box alignItems={BoxAlignItems.Center} twClassName="mt-2">
        {isQuoteLoading && !hasInsufficientBalance ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            testID="quick-buy-amount-loading"
          >
            <Skeleton
              width={88}
              height={24}
              style={tw.style('rounded-md')}
              testID="quick-buy-amount-loading-skeleton"
            />
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              testID="quick-buy-amount-loading-symbol"
            >
              {destSymbol}
            </Text>
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              hasInsufficientBalance
                ? TextColor.ErrorDefault
                : TextColor.TextAlternative
            }
            numberOfLines={1}
          >
            {secondaryLabel}
          </Text>
        )}
      </Box>
    </Box>
  );

  // On the keyboard treatment the headline is tappable to (re)open the keypad.
  // activeOpacity={1} keeps it visually static — no press feedback.
  if (onAmountAreaPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onAmountAreaPress}
        accessibilityRole="button"
        testID={QuickBuySheetSelectorsIDs.AMOUNT_AREA_PRESSABLE}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default QuickBuyAmountSection;
