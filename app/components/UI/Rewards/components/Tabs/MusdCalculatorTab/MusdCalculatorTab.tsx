import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BigNumber } from 'bignumber.js';
import { EthScope } from '@metamask/keyring-api';
import { CaipAssetType } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { handleDeeplink } from '../../../../../../core/DeeplinkManager';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../../../../Bridge/types';
import { getTokenIconUrl } from '../../../../Bridge/utils';
import { getNativeSourceToken } from '../../../../Bridge/utils/tokenUtils';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../../Earn/constants/musd';
import useFiatFormatter from '../../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { RewardsMetricsButtons } from '../../../utils';
import {
  amountToPercent,
  clampAmount,
  MUSD_CALCULATOR_APY,
  percentToAmount,
} from '../../../utils/musdCalculatorSlider';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg/ImageOrSvg.types.d.cts';

const BUY_MUSD_URL =
  'https://link.metamask.io/buy?address=0xaca92e438df0b2401ff60da7e4337b687a2435da&amount=100&chainid=1&sig_params=address%2Camount%2Cchainid%2Cutm_source&utm_source=rewards&sig=SdHOoh_QvT1bs8B6g-qCyLH5mUEczYzeOfAv9SNRm4CKjR6uBnUp4e1-Vcojb39fWWScBrui2GLftNlJKQlrAQ';

const MUSD_DEST_TOKEN: BridgeToken = {
  address: MUSD_TOKEN_ADDRESS,
  symbol: MUSD_TOKEN.symbol.toUpperCase(),
  name: MUSD_TOKEN.name,
  decimals: MUSD_TOKEN.decimals,
  chainId: '0x1',
  image: getTokenIconUrl(
    MUSD_TOKEN_ASSET_ID_BY_CHAIN['0x1'] as CaipAssetType,
    false,
  ),
};

const TRACK_HEIGHT = 12;
const THUMB_SIZE_REST = 24;
const THUMB_SIZE_DRAG = 32;
const THUMB_DRAG_SCALE = THUMB_SIZE_DRAG / THUMB_SIZE_REST;
const SLIDER_ROW_HEIGHT = 32;

const MusdCalculatorTab: React.FC = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [amount, setAmount] = useState(1000);
  const [trackWidth, setTrackWidth] = useState(0);

  const thumbScale = useSharedValue(1);

  const ethSourceToken = useMemo(
    () => getNativeSourceToken(EthScope.Mainnet),
    [],
  );

  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const formatCurrency = useCallback(
    (value: number) => formatFiat(new BigNumber(value)),
    [formatFiat],
  );

  const yearlyEarnings = useMemo(() => amount * MUSD_CALCULATOR_APY, [amount]);
  const monthlyEarnings = useMemo(
    () => (amount * MUSD_CALCULATOR_APY) / 12,
    [amount],
  );
  const dailyEarnings = useMemo(
    () => (amount * MUSD_CALCULATOR_APY) / 365,
    [amount],
  );

  const thumbPct = amountToPercent(amount);
  const filledWidth = trackWidth > 0 ? (thumbPct / 100) * trackWidth : 0;
  const thumbLeft = trackWidth > 0 ? filledWidth - THUMB_SIZE_REST / 2 : 0;

  const updateAmountFromX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) {
        return;
      }
      const clampedX = Math.max(0, Math.min(trackWidth, x));
      const pct = (clampedX / trackWidth) * 100;
      setAmount(clampAmount(percentToAmount(pct)));
    },
    [trackWidth],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          thumbScale.value = withTiming(THUMB_DRAG_SCALE, { duration: 150 });
          runOnJS(updateAmountFromX)(e.x);
        })
        .onUpdate((e) => {
          runOnJS(updateAmountFromX)(e.x);
        })
        .onFinalize(() => {
          thumbScale.value = withTiming(1, { duration: 150 });
        }),
    [thumbScale, updateAmountFromX],
  );

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  const handleBuyMusd = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({ button_type: RewardsMetricsButtons.BUY_MUSD })
        .build(),
    );
    handleDeeplink({ uri: BUY_MUSD_URL });
  }, [trackEvent, createEventBuilder]);

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: Routes.REWARDS_DASHBOARD,
    sourceToken: ethSourceToken,
    destToken: MUSD_DEST_TOKEN,
  });

  const handleSwapMusd = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({ button_type: RewardsMetricsButtons.SWAP_TO_MUSD })
        .build(),
    );
    goToSwaps();
  }, [goToSwaps, trackEvent, createEventBuilder]);

  return (
    <ScrollView
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('flex-grow px-4 pb-6 pt-2')}
      keyboardShouldPersistTaps="handled"
    >
      <Box twClassName="flex-1 flex-col">
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
        >
          <AvatarToken
            name={MUSD_TOKEN.symbol}
            src={MUSD_TOKEN.imageSource as ImageOrSvgSrc}
            size={AvatarTokenSize.Xl}
          />

          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            twClassName="mt-4"
          >
            <Text
              variant={TextVariant.DisplayMd}
              twClassName="text-center font-semibold"
            >
              {strings('rewards.musd.hero_hold')}
            </Text>
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.SuccessDefault}
              twClassName="text-center font-semibold"
            >
              {strings('rewards.musd.hero_earn')}
            </Text>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            twClassName="mt-4 mb-6"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Baseline}
              justifyContent={BoxJustifyContent.Center}
              twClassName="gap-1 overflow-visible"
            >
              <Text
                variant={TextVariant.DisplayLg}
                color={TextColor.SuccessDefault}
                twClassName="text-[64px] leading-[72px] font-semibold"
              >
                {strings('rewards.musd.yearly_positive_prefix')}
                {formatCurrency(yearlyEarnings)}
              </Text>
              <Text
                variant={TextVariant.HeadingMd}
                color={TextColor.SuccessDefault}
                twClassName="text-2xl font-semibold"
              >
                {strings('rewards.musd.earnings_per_year_suffix')}
              </Text>
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="gap-2"
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {formatCurrency(monthlyEarnings)}
                {strings('rewards.musd.earnings_per_month_suffix')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {formatCurrency(dailyEarnings)}
                {strings('rewards.musd.earnings_per_day_suffix')}
              </Text>
            </Box>
          </Box>

          <Box twClassName="w-full gap-2">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('rewards.musd.slider_amount_label')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                testID="musd-slider-amount-display"
              >
                {formatCurrency(amount)}
              </Text>
            </Box>

            <GestureDetector gesture={panGesture}>
              <Pressable
                testID="musd-slider-track"
                accessibilityRole="adjustable"
                accessibilityValue={{ text: formatCurrency(amount) }}
                onLayout={(event) => {
                  setTrackWidth(event.nativeEvent.layout.width);
                }}
                onPressIn={(event) => {
                  updateAmountFromX(event.nativeEvent.locationX);
                }}
                style={tw.style('h-8 w-full justify-center')}
              >
                <Box
                  twClassName="absolute left-0 right-0 rounded-full bg-muted"
                  style={{
                    height: TRACK_HEIGHT,
                    top: (SLIDER_ROW_HEIGHT - TRACK_HEIGHT) / 2,
                  }}
                />
                <Box
                  twClassName="absolute left-0 rounded-full bg-success-default"
                  style={{
                    width: filledWidth,
                    height: TRACK_HEIGHT,
                    top: (SLIDER_ROW_HEIGHT - TRACK_HEIGHT) / 2,
                  }}
                />
                <Animated.View
                  style={[
                    tw.style(
                      'absolute rounded-full border-3 border-muted bg-white shadow-md',
                    ),
                    {
                      width: THUMB_SIZE_REST,
                      height: THUMB_SIZE_REST,
                      top: (SLIDER_ROW_HEIGHT - THUMB_SIZE_REST) / 2,
                      left: thumbLeft,
                    },
                    animatedThumbStyle,
                  ]}
                />
              </Pressable>
            </GestureDetector>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              justifyContent={BoxJustifyContent.Between}
              twClassName="mt-1"
            >
              <Box twClassName="min-w-[72px] flex-1 items-start">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('rewards.musd.scale_min')}
                </Text>
              </Box>
              <Box twClassName="min-w-[72px] flex-1 items-center">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('rewards.musd.scale_mid')}
                </Text>
              </Box>
              <Box twClassName="min-w-[72px] flex-1 items-end">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('rewards.musd.scale_max')}
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mb-6 max-w-[361px] self-center text-center leading-[22px]"
        >
          {strings('rewards.musd.disclaimer_calculator')}
        </Text>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Stretch}
          twClassName="gap-4"
        >
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleSwapMusd}
            twClassName="min-h-12 flex-1"
            testID="musd-swap-button"
          >
            {strings('rewards.musd.swap_button')}
          </Button>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleBuyMusd}
            twClassName="min-h-12 flex-1"
            testID="musd-buy-button"
          >
            {strings('rewards.musd.buy_button')}
          </Button>
        </Box>
      </Box>
    </ScrollView>
  );
};

export default MusdCalculatorTab;
