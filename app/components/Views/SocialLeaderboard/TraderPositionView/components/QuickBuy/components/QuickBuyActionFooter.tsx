import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  AvatarToken,
  AvatarTokenSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeNetwork,
} from '@metamask/design-system-react-native';
import { TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import QuickBuyBanners from '../QuickBuyBanners';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { getBridgeTokenImageSource } from '../getBridgeTokenImageSource';

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
    sourceChainId,
    sourceBalanceFiat,
    destBalanceFiat,
    destToken,
    selectedDestStable,
    features,
    setActiveScreen,
  } = useQuickBuyContext();

  const pickerToken = tradeMode === 'sell' ? selectedDestStable : sourceToken;
  const pickerChainId =
    tradeMode === 'sell'
      ? (selectedDestStable?.chainId as
          | import('@metamask/utils').Hex
          | undefined)
      : sourceChainId;
  // Both balances are driven by live, selector-backed state (TSA-632):
  // `sourceBalanceFiat` from `useLatestBalance` re-keyed off the live cached
  // balance, and `destBalanceFiat` resynced from the reactive receive-token
  // list. Either updates the pill the moment the underlying balance changes.
  const pickerBalanceFiat =
    tradeMode === 'sell' ? destBalanceFiat : sourceBalanceFiat;

  const networkImage = pickerChainId
    ? getNetworkImageSource({ chainId: pickerChainId })
    : undefined;

  return (
    <Box twClassName="px-4 pb-4">
      {/* Slider — reduced top padding to tighten gap with the amount section */}
      <Box twClassName="pt-2 pb-3">
        <QuickBuyPercentageSlider
          value={sliderPercent}
          onValueChange={handleSliderChange}
          disabled={isSliderDisabled}
          onDragEnd={handleSliderDragEnd}
        />
      </Box>

      {/* Pay with / Receive with row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="pb-5"
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
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
              networkImage ? (
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={<BadgeNetwork src={networkImage} />}
                >
                  <AvatarToken
                    size={AvatarTokenSize.Sm}
                    name={pickerToken.symbol}
                    src={getBridgeTokenImageSource(pickerToken)}
                  />
                </BadgeWrapper>
              ) : (
                <AvatarToken
                  size={AvatarTokenSize.Sm}
                  name={pickerToken.symbol}
                  src={getBridgeTokenImageSource(pickerToken)}
                />
              )
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
