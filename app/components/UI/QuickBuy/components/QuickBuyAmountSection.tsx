import React, { useMemo } from 'react';
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
import { splitNumericString } from '../../../../component-library/components-temp/AnimatedNumericText/splitNumericString';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import useCurrency from '../../../Base/Keypad/useCurrency';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useTheme } from '../../../../util/theme';
import { useFormatters } from '../../../hooks/useFormatters';
import { formatAmountWithLocaleSeparators } from '../../Bridge/utils/formatAmountWithLocaleSeparators';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import type { QuickBuyAmountDisplayMode, QuickBuyTradeMode } from '../types';
import { formatTokenAmount } from '../../SocialFeed/utils/formatters';
import { strings } from '../../../../../locales/i18n';
import { MIN_POST_TRADE_SHARE_USD } from '../../../../util/social/postTradeShareThreshold';

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
  /** Selects the Buy/Sell copy of the empty-state post minimum helper. */
  tradeMode?: QuickBuyTradeMode;
  /** True while no amount is entered; shows the post minimum helper. */
  isEmptyAmount?: boolean;
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

/**
 * Show keypad-internal amounts (dot decimal) with the currency's locale
 * separator so editing matches the closed-keypad formatted headline.
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
  tradeMode,
  isEmptyAmount = false,
  onAmountAreaPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const formatters = useFormatters();
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const networkTier = useNetworkTier();
  // Glyph motion is local. The UX matrix only reduces it for LOW hardware on
  // a known slow cellular link. Unknown hardware or network stays on the
  // product default and is not treated as low-end or offline.
  const animateAmount = !(
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
  const postDisclaimer =
    tradeMode && isEmptyAmount
      ? strings(`social_leaderboard.quick_buy.min_post_${tradeMode}`, {
          amount: MIN_POST_TRADE_SHARE_USD,
        })
      : undefined;
  if (postDisclaimer && !sourceBalanceDisplay && !hasInsufficientBalance) {
    secondaryLabel = postDisclaimer;
  }
  const amountColor = hasInsufficientBalance
    ? TextColor.ErrorDefault
    : TextColor.TextDefault;

  const amountDisplay = useMemo(() => {
    if (!showCursor) {
      return { prefix: '', value: primaryLabel, suffix: '' };
    }

    if (isUnpricedSource) {
      const value = formatAmountDigitsForDisplay(
        sourceCryptoAmount || '0',
        decimalSeparator,
      );
      return {
        prefix: '',
        value,
        suffix: sourceSymbol ? ` ${sourceSymbol}` : '',
      };
    }

    const { prefix, suffix } = currency
      ? splitNumericString(
          formatters.formatCurrency(0, currency, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
        )
      : { prefix: '', suffix: '' };

    const value = formatAmountDigitsForDisplay(
      fiatAmount || '0',
      decimalSeparator,
    );

    return { prefix, value, suffix };
  }, [
    currency,
    decimalSeparator,
    fiatAmount,
    formatters,
    isUnpricedSource,
    primaryLabel,
    showCursor,
    sourceCryptoAmount,
    sourceSymbol,
  ]);
  const visibleAmountLabel = `${amountDisplay.prefix}${amountDisplay.value}${amountDisplay.suffix}`;
  const amountFontSize = getFontSizeForInputLength(
    amountDisplay.prefix.length +
      amountDisplay.value.length +
      amountDisplay.suffix.length +
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
        accessible={!onAmountAreaPress}
        accessibilityLabel={visibleAmountLabel}
        amountTestID={QuickBuySheetSelectorsIDs.AMOUNT_LABEL}
        animated={animateAmount}
        color={amountColor}
        containerStyle={AMOUNT_ROW_STYLE}
        cursor={
          showCursor
            ? {
                animated: animateAmount,
                style: cursorStyle,
                testID: QuickBuySheetSelectorsIDs.AMOUNT_CURSOR,
              }
            : false
        }
        fontFamily={FontFamily.Hero}
        prefix={amountDisplay.prefix || undefined}
        style={amountTextStyle}
        suffix={amountDisplay.suffix || undefined}
        suffixColor={amountColor}
        suffixStyle={amountTextStyle}
        testID="quick-buy-amount-row"
        value={amountDisplay.value}
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
        {postDisclaimer && sourceBalanceDisplay ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            testID="quick-buy-post-disclaimer"
          >
            {postDisclaimer}
          </Text>
        ) : null}
      </Box>
    </Box>
  );

  // On the keyboard treatment the headline is tappable to (re)open the keypad.
  // activeOpacity={1} keeps it visually static — no press feedback.
  if (onAmountAreaPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        accessibilityLabel={visibleAmountLabel}
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
