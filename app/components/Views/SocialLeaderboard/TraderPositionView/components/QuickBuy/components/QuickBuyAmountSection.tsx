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

const styles = StyleSheet.create({
  amountText: { fontSize: 48, lineHeight: 52 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
});

interface QuickBuyAmountSectionProps {
  amountDisplayMode: QuickBuyAmountDisplayMode;
  fiatCryptoToggleEnabled: boolean;
  usdAmount: string;
  destSymbol: string;
  /** Estimated amount received in the dest token from the quote. */
  estimatedCryptoAmount: string | undefined;
  availableBalanceFiat: string;
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
  onToggleAmountDisplay: () => void;
}

const QuickBuyAmountSection: React.FC<QuickBuyAmountSectionProps> = ({
  amountDisplayMode,
  fiatCryptoToggleEnabled,
  usdAmount,
  destSymbol,
  estimatedCryptoAmount,
  availableBalanceFiat,
  isQuoteLoading,
  isUnpricedSource = false,
  sourceCryptoAmount,
  sourceSymbol,
  hiddenInputRef,
  onAmountAreaPress,
  onAmountChange,
  onToggleAmountDisplay,
}) => {
  const fiatAmountLabel = usdAmount ? `$${usdAmount}` : '$0';

  const cryptoAmountLabel = estimatedCryptoAmount
    ? `${estimatedCryptoAmount} ${destSymbol}`
    : `0 ${destSymbol}`;

  let primaryLabel: string;
  let secondaryLabel: string;
  let showToggle: boolean;

  if (isUnpricedSource) {
    // Source has no fiat rate: the headline must be the source token amount
    // the user entered (slider or keyboard). The secondary line previews the
    // estimated destination amount, which only appears once a quote lands.
    const sourceLabel =
      `${sourceCryptoAmount || '0'} ${sourceSymbol ?? ''}`.trim();
    primaryLabel = sourceLabel;
    secondaryLabel = `≈ ${cryptoAmountLabel}`;
    showToggle = false;
  } else {
    const isCryptoPrimary = amountDisplayMode === 'crypto';
    primaryLabel = isCryptoPrimary ? cryptoAmountLabel : fiatAmountLabel;
    secondaryLabel = isCryptoPrimary ? fiatAmountLabel : cryptoAmountLabel;
    showToggle = fiatCryptoToggleEnabled;
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
            {showToggle ? (
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
