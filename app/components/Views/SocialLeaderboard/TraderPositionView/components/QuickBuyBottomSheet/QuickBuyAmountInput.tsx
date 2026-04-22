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
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../../locales/i18n';

const styles = StyleSheet.create({
  amountText: { fontSize: 48, lineHeight: 50 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
});

interface QuickBuyAmountInputProps {
  usdAmount: string;
  position: Position;
  estimatedReceiveAmount: string | undefined;
  isQuoteLoading: boolean;
  hasValidAmount: boolean;
  hasError: boolean;
  hiddenInputRef: React.RefObject<TextInput>;
  onAmountAreaPress: () => void;
  onAmountChange: (text: string) => void;
  colors: { text: { alternative: string } };
}

const QuickBuyAmountInput: React.FC<QuickBuyAmountInputProps> = ({
  usdAmount,
  position,
  estimatedReceiveAmount,
  isQuoteLoading,
  hasValidAmount,
  hasError,
  hiddenInputRef,
  onAmountAreaPress,
  onAmountChange,
  colors,
}) => (
  <TouchableOpacity
    onPress={onAmountAreaPress}
    activeOpacity={1}
    testID="quick-buy-amount-area"
  >
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={1}
      twClassName="py-12"
    >
      <Text
        style={styles.amountText}
        fontWeight={FontWeight.Bold}
        color={usdAmount ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {`$${usdAmount || '0'}`}
      </Text>

      {isQuoteLoading && hasValidAmount ? (
        <ActivityIndicator size="small" color={colors.text.alternative} />
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {estimatedReceiveAmount
            ? `${estimatedReceiveAmount} ${position.tokenSymbol}`
            : hasError && hasValidAmount
              ? strings('social_leaderboard.quick_buy.no_quotes')
              : `0 ${position.tokenSymbol}`}
        </Text>
      )}

      {/* Hidden TextInput for keyboard capture */}
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

export default QuickBuyAmountInput;
