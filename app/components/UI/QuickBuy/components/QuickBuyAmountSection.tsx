import React, { useMemo } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
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
import {
  formatCurrency,
  getCurrencySymbol,
} from '../../Bridge/utils/currencyUtils';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import type { QuickBuyAmountDisplayMode } from '../types';
import { formatTokenAmount } from '../../SocialFeed/utils/formatters';
import { strings } from '../../../../../locales/i18n';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { formatAmountWithLocaleSeparators } from '../../Bridge/utils/formatAmountWithLocaleSeparators';

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

const PRIMARY_AMOUNT_MAX_FONT_SIZE = 54;
const PRIMARY_AMOUNT_MAX_LINE_HEIGHT = 70;
const PRIMARY_AMOUNT_MAX_CURSOR_HEIGHT = 48;

export const getQuickBuyAmountFontSize = (contentLength: number): number =>
  Math.min(
    PRIMARY_AMOUNT_MAX_FONT_SIZE,
    getFontSizeForInputLength(contentLength),
  );

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
  return formatAmountWithLocaleSeparators(amount || '0', decimalSeparator);
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
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const networkTier = useNetworkTier();
  const amountAnimationEnabled = !(
    hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR'
  );
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

  const editingValue = formatAmountDigitsForDisplay(
    isUnpricedSource ? sourceCryptoAmount || '0' : fiatAmount || '0',
    decimalSeparator,
  );
  const currencySymbol = currency ? getCurrencySymbol(currency) : '';
  const currencySymbolIsPrefix = currency
    ? isCurrencySymbolPrefix(currency)
    : true;
  const editingPrefix =
    !isUnpricedSource && currencySymbol && currencySymbolIsPrefix
      ? currencySymbol
      : undefined;
  let editingSuffix: string | undefined;
  if (isUnpricedSource && sourceSymbol) {
    editingSuffix = ` ${sourceSymbol}`;
  } else if (currencySymbol && !currencySymbolIsPrefix) {
    editingSuffix = ` ${currencySymbol}`;
  }
  const editingAccessibilityLabel = `${editingPrefix ?? ''}${editingValue}${
    editingSuffix ?? ''
  }`;
  const primaryAccessibilityLabel = showCursor
    ? editingAccessibilityLabel
    : primaryLabel;
  const amountFontSize = getQuickBuyAmountFontSize(
    primaryAccessibilityLabel.length,
  );
  const amountLineHeight = Math.min(
    PRIMARY_AMOUNT_MAX_LINE_HEIGHT,
    amountFontSize + 16,
  );
  const cursorHeight = Math.min(
    PRIMARY_AMOUNT_MAX_CURSOR_HEIGHT,
    Math.round((amountFontSize * 8) / 9),
  );
  const primaryAmountStyle = tw.style('tracking-tight', {
    fontSize: amountFontSize,
    lineHeight: amountLineHeight,
  });

  // While the keypad is open, render amount digits + caret + currency/token
  // affix separately so the caret sits where typing happens (after digits),
  // not after a suffix symbol like "US$" / "ETH".
  const primaryAmount = showCursor ? (
    <AnimatedAmountDisplay
      accessible={!onAmountAreaPress}
      accessibilityLabel={editingAccessibilityLabel}
      amountTestID={QuickBuySheetSelectorsIDs.AMOUNT_LABEL}
      animated={amountAnimationEnabled}
      color={amountColor}
      containerStyle={tw.style('max-w-full justify-center')}
      cursor={{
        animated: amountAnimationEnabled,
        testID: QuickBuySheetSelectorsIDs.AMOUNT_CURSOR,
        style: tw.style(
          `mx-0.5 w-0.5 h-[${cursorHeight}px] bg-primary-default`,
        ),
      }}
      fontWeight={FontWeight.Bold}
      prefix={editingPrefix}
      style={primaryAmountStyle}
      suffix={editingSuffix}
      value={editingValue}
      variant={TextVariant.DisplayLg}
    />
  ) : (
    <AnimatedAmountDisplay
      accessible={!onAmountAreaPress}
      accessibilityLabel={primaryLabel}
      amountTestID={QuickBuySheetSelectorsIDs.AMOUNT_LABEL}
      animated={amountAnimationEnabled}
      color={amountColor}
      containerStyle={tw.style('max-w-full justify-center')}
      fontWeight={FontWeight.Bold}
      style={primaryAmountStyle}
      value={primaryLabel}
      variant={TextVariant.DisplayLg}
    />
  );

  const content = (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
      twClassName="px-4 pt-6 pb-4"
      testID={QuickBuySheetSelectorsIDs.AMOUNT_AREA}
    >
      {primaryAmount}

      {isQuoteLoading && !hasInsufficientBalance ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          testID="quick-buy-amount-loading"
        >
          <Skeleton
            width={88}
            height={16}
            style={tw.style('rounded-md')}
            testID="quick-buy-amount-loading-skeleton"
          />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID="quick-buy-amount-loading-symbol"
          >
            {destSymbol}
          </Text>
        </Box>
      ) : (
        <Text
          variant={TextVariant.BodySm}
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
  );

  // On the keyboard treatment the headline is tappable to (re)open the keypad.
  // activeOpacity={1} keeps it visually static — no press feedback.
  if (onAmountAreaPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        accessibilityLabel={primaryAccessibilityLabel}
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
