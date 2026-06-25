import React from 'react';
import { TextInput } from 'react-native';
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
import type { QuickBuyAmountDisplayMode } from '../types';
import { formatTokenAmount } from '../../../../utils/formatters';

interface QuickBuyAmountSectionProps {
  amountDisplayMode: QuickBuyAmountDisplayMode;
  /** Entered amount preformatted in the user's display currency (e.g. "$20", "20 €"). */
  fiatAmountLabel: string;
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
  // Custom-amount input is temporarily disabled (numpad removed). The slider is
  // the only input path for now, but these props remain on the interface so the
  // controller wiring is preserved for when the keyboard path is restored.
  hiddenInputRef?: React.RefObject<TextInput | null>;
  onAmountAreaPress?: () => void;
  onAmountChange?: (text: string) => void;
}

const QuickBuyAmountSection: React.FC<QuickBuyAmountSectionProps> = ({
  amountDisplayMode,
  fiatAmountLabel,
  destSymbol,
  estimatedReceiveAmount,
  isQuoteLoading,
  isUnpricedSource = false,
  sourceCryptoAmount,
  sourceSymbol,
}) => {
  const tw = useTailwind();

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

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
      twClassName="px-4 pt-6 pb-4"
      testID="quick-buy-amount-area"
    >
      <Text
        variant={TextVariant.DisplayMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {primaryLabel}
      </Text>

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
};

export default QuickBuyAmountSection;
