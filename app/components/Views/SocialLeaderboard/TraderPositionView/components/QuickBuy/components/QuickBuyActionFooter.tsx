import { AnimationDuration } from '@metamask/design-tokens';
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
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyBanners from '../QuickBuyBanners';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

const FOOTER_ANIM_DURATION = AnimationDuration.Fast;

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
    useKeyboard,
    isKeypadOpen,
  } = useQuickBuyContext();

  const pickerToken = tradeMode === 'sell' ? selectedDestStable : sourceToken;
  const pickerBalanceFiat =
    tradeMode === 'sell' ? destBalanceFiat : sourceBalanceFiat;
  const isKeypadEditing = useKeyboard && isKeypadOpen;

  return (
    <Box twClassName="px-4">
      {/* Slider — control variant only. The keyboard treatment replaces it with
          the numeric keypad rendered below the CTA. */}
      {useKeyboard ? null : (
        <Box twClassName="pt-2 pb-3">
          <QuickBuyPercentageSlider
            value={sliderPercent}
            onValueChange={handleSliderChange}
            disabled={isSliderDisabled}
            onDragEnd={handleSliderDragEnd}
          />
        </Box>
      )}

      {features.quickAmountPills && !isKeypadEditing ? (
        <Animated.View
          entering={FadeIn.duration(FOOTER_ANIM_DURATION)}
          exiting={FadeOut.duration(FOOTER_ANIM_DURATION)}
        >
          <Box twClassName="pb-3">
            <QuickBuyQuickAmounts />
          </Box>
        </Animated.View>
      ) : null}

      <QuickBuyBanners isHardwareSolanaBlocked={isHardwareSolanaBlocked} />

      {!isKeypadEditing ? (
        <Animated.View
          entering={FadeIn.duration(FOOTER_ANIM_DURATION)}
          exiting={FadeOut.duration(FOOTER_ANIM_DURATION)}
        >
          {/* Pay with / Receive with row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="pb-5"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
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
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                >
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
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.quick_buy.includes_mm_fee', {
                  fee: metamaskFeePercent,
                })}
              </Text>
            </Box>
          ) : null}
        </Animated.View>
      ) : null}
    </Box>
  );
};

export default QuickBuyActionFooter;
