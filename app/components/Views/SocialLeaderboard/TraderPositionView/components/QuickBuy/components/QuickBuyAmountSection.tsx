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
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import type { QuickBuyAmountDisplayMode } from '../types';
import { formatTokenAmount } from '../../../../utils/formatters';

const styles = StyleSheet.create({
  amountText: { fontSize: 48, lineHeight: 52 },
});

interface QuickBuyAmountSectionProps {
  amountDisplayMode: QuickBuyAmountDisplayMode;
  fiatCryptoToggleEnabled: boolean;
  usdAmount: string;
  destSymbol: string;
  estimatedReceiveAmount: string | undefined;
  availableBalanceFiat: string;
  isQuoteLoading: boolean;
  // Custom-amount input is temporarily disabled (numpad removed). The slider is
  // the only input path for now, but these props remain on the interface so the
  // controller wiring is preserved for when the keyboard path is restored.
  hiddenInputRef?: React.RefObject<TextInput | null>;
  onAmountAreaPress?: () => void;
  onAmountChange?: (text: string) => void;
  onToggleAmountDisplay: () => void;
}

const QuickBuyAmountSection: React.FC<QuickBuyAmountSectionProps> = ({
  amountDisplayMode,
  fiatCryptoToggleEnabled,
  usdAmount,
  destSymbol,
  estimatedReceiveAmount,
  availableBalanceFiat,
  isQuoteLoading,
  onToggleAmountDisplay,
}) => {
  const fiatAmountLabel = usdAmount ? `$${usdAmount}` : '$0';
  const cryptoAmountLabel = estimatedReceiveAmount
    ? `${formatTokenAmount(parseFloat(estimatedReceiveAmount))} ${destSymbol}`
    : `0 ${destSymbol}`;

  const isCryptoPrimary = amountDisplayMode === 'crypto';
  const primaryLabel = isCryptoPrimary ? cryptoAmountLabel : fiatAmountLabel;
  const secondaryLabel = isCryptoPrimary ? fiatAmountLabel : cryptoAmountLabel;

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
      twClassName="px-4 pt-6 pb-4"
      testID="quick-buy-amount-area"
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
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {secondaryLabel}
          </Text>
          {fiatCryptoToggleEnabled ? (
            <TouchableOpacity
              onPress={onToggleAmountDisplay}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={strings(
                'social_leaderboard.quick_buy.toggle_amount_display',
              )}
              testID="quick-buy-toggle-amount-display"
            >
              <Icon
                name={IconName.SwapVertical}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </TouchableOpacity>
          ) : null}
        </Box>
      )}

      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('social_leaderboard.quick_buy.available_balance', {
          amount: availableBalanceFiat,
        })}
      </Text>
    </Box>
  );
};

export default QuickBuyAmountSection;
