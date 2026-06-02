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
  estimatedReceiveAmount: string | undefined;
  isQuoteLoading: boolean;
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
  hiddenInputRef,
  onAmountAreaPress,
  onAmountChange,
}) => {
  const fiatAmountLabel = usdAmount ? `$${usdAmount}` : '$0';
  const cryptoAmountLabel = estimatedReceiveAmount
    ? `${formatTokenAmount(parseFloat(estimatedReceiveAmount))} ${destSymbol}`
    : `0 ${destSymbol}`;

  const isCryptoPrimary = amountDisplayMode === 'crypto';
  const primaryLabel = isCryptoPrimary ? cryptoAmountLabel : fiatAmountLabel;
  const secondaryLabel = isCryptoPrimary ? fiatAmountLabel : cryptoAmountLabel;

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
          value={usdAmount}
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
