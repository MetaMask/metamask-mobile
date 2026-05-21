import React from 'react';
import { Box ,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import QuickBuyBanners from '../QuickBuyBanners';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';

interface QuickBuyActionFooterProps {
  sliderPercent: number;
  maxSpendUsd: number;
  onSliderChange: (percent: number) => void;
  confirmButtonState: 'idle' | 'loading' | 'success';
  confirmLabel: string;
  hasValidAmount: boolean;
  isConfirmDisabled: boolean;
  onConfirm: () => void;
  metamaskFeePercent: number;
  isHardwareSolanaBlocked: boolean;
  isPriceImpactError: boolean;
  isPriceImpactWarning: boolean;
  formattedPriceImpact: string;
}

const QuickBuyActionFooter: React.FC<QuickBuyActionFooterProps> = ({
  sliderPercent,
  maxSpendUsd,
  onSliderChange,
  confirmButtonState,
  confirmLabel,
  hasValidAmount,
  isConfirmDisabled,
  onConfirm,
  metamaskFeePercent,
  isHardwareSolanaBlocked,
  isPriceImpactError,
  isPriceImpactWarning,
  formattedPriceImpact,
}) => (
  <Box twClassName="px-4 pb-4">
    <Box twClassName="py-4">
      <QuickBuyPercentageSlider
        value={sliderPercent}
        onValueChange={onSliderChange}
        disabled={maxSpendUsd <= 0}
      />
    </Box>

    <QuickBuyBanners
      isHardwareSolanaBlocked={isHardwareSolanaBlocked}
      isPriceImpactError={isPriceImpactError}
      isPriceImpactWarning={isPriceImpactWarning}
      formattedPriceImpact={formattedPriceImpact}
    />

    <QuickBuyConfirmButton
      state={confirmButtonState}
      label={confirmLabel}
      hasValidAmount={hasValidAmount}
      isDisabled={isConfirmDisabled}
      onPress={onConfirm}
      testID="quick-buy-confirm-button"
    />

    {metamaskFeePercent > 0 ? (
      <Box twClassName="mt-2 items-center">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.quick_buy.includes_mm_fee', {
            fee: metamaskFeePercent,
          })}
        </Text>
      </Box>
    ) : null}
  </Box>
);

export default QuickBuyActionFooter;
