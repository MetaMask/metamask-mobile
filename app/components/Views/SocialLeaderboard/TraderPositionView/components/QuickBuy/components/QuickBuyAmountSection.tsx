import React, { useMemo } from 'react';
import { Animated, TextInput, TouchableOpacity } from 'react-native';
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
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
import { useBlinkingCursor } from '../../../../../../UI/Ramp/hooks/useBlinkingCursor';
import {
  formatCurrency,
  getCurrencySymbol,
} from '../../../../../../UI/Bridge/utils/currencyUtils';
import type { QuickBuyAmountDisplayMode } from '../types';
import { formatTokenAmount } from '../../../../utils/formatters';

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
  /** When true, shows a blinking caret after the editable digits (keypad open). */
  showCursor?: boolean;
  // Custom-amount input is temporarily disabled (numpad removed). The slider is
  // the only input path for now, but these props remain on the interface so the
  // controller wiring is preserved for when the keyboard path is restored.
  hiddenInputRef?: React.RefObject<TextInput | null>;
  onAmountAreaPress?: () => void;
  onAmountChange?: (text: string) => void;
}

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

const QuickBuyAmountSection: React.FC<QuickBuyAmountSectionProps> = ({
  amountDisplayMode,
  fiatAmountLabel,
  fiatAmount = '',
  currency,
  destSymbol,
  estimatedReceiveAmount,
  isQuoteLoading,
  isUnpricedSource = false,
  sourceCryptoAmount,
  sourceSymbol,
  showCursor = false,
  onAmountAreaPress,
}) => {
  const tw = useTailwind();
  const cursorOpacity = useBlinkingCursor(showCursor);

  const cryptoAmountLabel = estimatedReceiveAmount
    ? `${formatTokenAmount(parseFloat(estimatedReceiveAmount))} ${destSymbol}`
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
    secondaryLabel = `≈ ${cryptoAmountLabel}`;
  } else {
    const isCryptoPrimary = amountDisplayMode === 'crypto';
    primaryLabel = isCryptoPrimary ? cryptoAmountLabel : fiatAmountLabel;
    secondaryLabel = isCryptoPrimary ? fiatAmountLabel : cryptoAmountLabel;
  }

  // While the keypad is open, render amount digits + caret + currency/token
  // affix separately so the caret sits where typing happens (after digits),
  // not after a suffix symbol like "US$" / "ETH".
  const editingPrimary = useMemo(() => {
    if (!showCursor) {
      return null;
    }

    const cursor = (
      <Animated.View
        testID="quick-buy-amount-cursor"
        style={[
          tw.style('mx-0.5 w-0.5 h-8 bg-primary-default'),
          { opacity: cursorOpacity },
        ]}
      />
    );

    if (isUnpricedSource) {
      const amountDigits = sourceCryptoAmount || '0';
      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {amountDigits}
          </Text>
          {cursor}
          {sourceSymbol ? (
            <Text
              variant={TextVariant.DisplayMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {` ${sourceSymbol}`}
            </Text>
          ) : null}
        </Box>
      );
    }

    const amountDigits = fiatAmount || '0';
    const symbol = currency ? getCurrencySymbol(currency) : '';
    const symbolIsPrefix = currency ? isCurrencySymbolPrefix(currency) : true;

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        {symbol && symbolIsPrefix ? (
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {symbol}
          </Text>
        ) : null}
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {amountDigits}
        </Text>
        {cursor}
        {symbol && !symbolIsPrefix ? (
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {` ${symbol}`}
          </Text>
        ) : null}
      </Box>
    );
  }, [
    showCursor,
    isUnpricedSource,
    sourceCryptoAmount,
    sourceSymbol,
    fiatAmount,
    currency,
    cursorOpacity,
    tw,
  ]);

  const content = (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
      twClassName="px-4 pt-6 pb-4"
      testID="quick-buy-amount-area"
    >
      {editingPrimary ?? (
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {primaryLabel}
        </Text>
      )}

      {isQuoteLoading ? (
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
          color={TextColor.TextAlternative}
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
        onPress={onAmountAreaPress}
        accessibilityRole="button"
        testID="quick-buy-amount-area-pressable"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default QuickBuyAmountSection;
