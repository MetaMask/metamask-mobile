import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyBanners from '../QuickBuyBanners';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

const QuickBuyActionFooter: React.FC = () => {
  const {
    sliderPercent,
    isSliderDisabled,
    handleSliderChange,
    handleSliderDragEnd,
    confirmButtonState,
    getButtonLabel,
    hasValidAmount,
    isConfirmDisabled,
    handleBuy,
    metamaskFeePercent,
    isHardwareSolanaBlocked,
    tradeMode,
    sourceToken,
    sourceBalanceFiat,
    destBalanceFiat,
    selectedDestStable,
    features,
    setActiveScreen,
  } = useQuickBuyContext();

  const pickerToken = tradeMode === 'sell' ? selectedDestStable : sourceToken;
  const pickerBalanceFiat =
    tradeMode === 'sell' ? destBalanceFiat : sourceBalanceFiat;

  return (
    <Box twClassName="px-4">
      {/* Slider — reduced top padding to tighten gap with the amount section */}
      <Box twClassName="pt-2 pb-3">
        <QuickBuyPercentageSlider
          value={sliderPercent}
          onValueChange={handleSliderChange}
          disabled={isSliderDisabled}
          onDragEnd={handleSliderDragEnd}
        />
      </Box>

      {features.quickAmountPills ? (
        <Box twClassName="pb-3">
          <QuickBuyQuickAmounts />
        </Box>
      ) : null}

      {/* Pay with / Receive with row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="pb-5"
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {tradeMode === 'sell'
            ? strings('social_leaderboard.quick_buy.receive')
            : strings('social_leaderboard.quick_buy.pay_with')}
        </Text>

        <TouchableOpacity
          disabled={!features.payWithSheet}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID="quick-buy-pay-with-button"
          onPress={() => setActiveScreen('payWith')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            {pickerToken ? (
              <QuickBuyTokenIcon
                token={pickerToken}
                size={AvatarTokenSize.Sm}
              />
            ) : null}
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {pickerToken
                ? pickerBalanceFiat
                  ? `${pickerToken.symbol} (${pickerBalanceFiat})`
                  : pickerToken.symbol
                : '—'}
            </Text>
            {features.payWithSheet ? (
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
            ) : null}
          </Box>
        </TouchableOpacity>
      </Box>

      <QuickBuyBanners isHardwareSolanaBlocked={isHardwareSolanaBlocked} />

      <QuickBuyConfirmButton
        state={confirmButtonState}
        label={getButtonLabel()}
        hasValidAmount={hasValidAmount}
        isDisabled={isConfirmDisabled}
        onPress={handleBuy}
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
