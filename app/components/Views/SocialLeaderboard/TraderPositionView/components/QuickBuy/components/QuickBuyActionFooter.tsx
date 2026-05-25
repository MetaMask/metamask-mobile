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
    sourceToken,
    sourceChainId,
    sourceBalanceFiat,
    features,
  } = useQuickBuyContext();

  const isPriceImpactWarning =
    !isPriceImpactError && !!priceImpactViewData.icon;

  const networkImage = sourceChainId
    ? getNetworkImageSource({ chainId: sourceChainId })
    : undefined;

  return (
    <Box twClassName="px-4 pb-4">
      {/* Slider — reduced top padding to tighten gap with the amount section */}
      <Box twClassName="pt-2 pb-3">
        <QuickBuyPercentageSlider
          value={sliderPercent}
          onValueChange={handleSliderChange}
          disabled={maxSpendUsd <= 0}
        />
      </Box>

      {/* Pay with row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="pb-3"
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.quick_buy.pay_with')}
        </Text>

        <TouchableOpacity
          disabled={!features.payWithSheet}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID="quick-buy-pay-with-button"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="rounded-full bg-muted px-3 py-1"
          >
            {sourceToken ? (
              networkImage ? (
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={<BadgeNetwork src={networkImage} />}
                >
                  <AvatarToken
                    size={AvatarTokenSize.Sm}
                    name={sourceToken.symbol}
                    src={getBridgeTokenImageSource(sourceToken)}
                  />
                </BadgeWrapper>
              ) : (
                <AvatarToken
                  size={AvatarTokenSize.Sm}
                  name={sourceToken.symbol}
                  src={getBridgeTokenImageSource(sourceToken)}
                />
              )
            ) : null}
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {sourceToken
                ? sourceBalanceFiat
                  ? `${sourceToken.symbol} (${sourceBalanceFiat})`
                  : sourceToken.symbol
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
