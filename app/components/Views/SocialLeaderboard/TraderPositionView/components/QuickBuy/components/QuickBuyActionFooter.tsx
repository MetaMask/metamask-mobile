import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import QuickBuyBanners from '../QuickBuyBanners';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';

const QuickBuyActionFooter: React.FC = () => {
  const {
    sliderPercent,
    maxSpendUsd,
    handleSliderChange,
    confirmButtonState,
    getButtonLabel,
    hasValidAmount,
    isConfirmDisabled,
    handleConfirm,
    metamaskFeePercent,
    isHardwareSolanaBlocked,
    isPriceImpactError,
    priceImpactViewData,
    formattedPriceImpact,
  } = useQuickBuyContext();

  const isPriceImpactWarning =
    !isPriceImpactError && !!priceImpactViewData.icon;

  return (
    <Box twClassName="px-4 pb-4">
      <Box twClassName="py-4">
        <QuickBuyPercentageSlider
          value={sliderPercent}
          onValueChange={handleSliderChange}
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
        label={getButtonLabel()}
        hasValidAmount={hasValidAmount}
        isDisabled={isConfirmDisabled}
        onPress={handleConfirm}
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
};

export default QuickBuyActionFooter;
