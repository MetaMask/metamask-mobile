import React from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import type { QuickBuyAmountDisplayMode } from '../types';
import { formatTokenAmount } from '../../../../utils/formatters';

const styles = StyleSheet.create({
  amountText: { fontSize: 48, lineHeight: 52 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
});

interface QuickBuyAmountSectionProps {
  amountDisplayMode: QuickBuyAmountDisplayMode;
  usdAmount: string;
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
  hiddenInputRef: React.RefObject<TextInput | null>;
  onAmountAreaPress: () => void;
  onAmountChange: (text: string) => void;
}

const QuickBuyAmountSection: React.FC<QuickBuyAmountSectionProps> = ({
  amountDisplayMode,
  usdAmount,
  destSymbol,
  estimatedReceiveAmount,
  isQuoteLoading,
  isUnpricedSource = false,
  sourceCryptoAmount,
  sourceSymbol,
  hiddenInputRef,
  onAmountAreaPress,
  onAmountChange,
}) => {
  const fiatAmountLabel = usdAmount ? `$${usdAmount}` : '$0';
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
    <TouchableOpacity
      onPress={onAmountAreaPress}
      activeOpacity={1}
      testID="quick-buy-amount-area"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={2}
        twClassName="px-4 pt-6 pb-4"
      >
        <Text
          style={styles.amountText}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {primaryLabel}
        </Text>

        {isQuoteLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {secondaryLabel}
          </Text>
        )}

        <TextInput
          ref={hiddenInputRef}
          value={isUnpricedSource ? (sourceCryptoAmount ?? '') : usdAmount}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          style={styles.hiddenInput}
          testID="quick-buy-amount-input"
        />
      </Box>
    </TouchableOpacity>
  );
};

export default QuickBuyAmountSection;
