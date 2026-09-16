import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { formatPrice } from '../../../../../../UI/Predict/utils/format';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import { selectPredictEnabledFlag } from '../../../../../../UI/Predict/selectors/featureFlags';
import type {
  PredictMarket,
  PredictSeries,
} from '../../../../../../UI/Predict/types';
import useSectionViewportVisible from '../../../../hooks/useSectionViewportVisible';
import HomepagePredictDiscoveryMaterialGlyph from './HomepagePredictDiscoveryMaterialGlyph';
import HomepagePredictDiscoveryLivePill from './HomepagePredictDiscoveryLivePill';

/** Hold the live subscription after the row scrolls off-screen. */
export const BTC_LIVE_DISCONNECT_DELAY_MS = 5000;

const formatBtc = (value: number | undefined) =>
  value === undefined || Number.isNaN(value)
    ? '\u2014'
    : formatPrice(value, { maximumDecimals: 0 });

interface BtcLiveRowProps {
  series: PredictSeries;
  onPress: (
    series: PredictSeries,
    marketId: string | undefined,
    market: PredictMarket | undefined,
  ) => void;
}

interface BtcLiveValuesHandle {
  marketId: string | undefined;
  market: PredictMarket | undefined;
}

const BtcCurrentPrice = memo(({ value }: { value: number | undefined }) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextDefault}
    numberOfLines={1}
  >
    {strings('predict.homepage_discovery.btc_title', {
      price: formatBtc(value),
    })}
  </Text>
));

const BtcPriceToBeat = memo(({ value }: { value: number | undefined }) => {
  const tw = useTailwind();

  return (
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      numberOfLines={1}
      style={tw.style('mt-0.5')}
    >
      {strings('predict.homepage_discovery.btc_price_to_beat', {
        price: formatBtc(value),
      })}
    </Text>
  );
});

const BtcMarketValues = memo(
  ({
    currentPrice,
    priceToBeat,
  }: {
    currentPrice: number | undefined;
    priceToBeat: number | undefined;
  }) => (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="min-w-0 flex-1 pl-4"
    >
      <BtcCurrentPrice value={currentPrice} />
      <BtcPriceToBeat value={priceToBeat} />
    </Box>
  ),
);

interface BtcLiveValuesProps {
  series: PredictSeries;
  isVisibleForLive: boolean;
}

const BtcLiveValues = forwardRef<BtcLiveValuesHandle, BtcLiveValuesProps>(
  ({ series, isVisibleForLive }, ref) => {
    const isFocused = useIsFocused();
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const enabled = isPredictEnabled && isFocused && isVisibleForLive;
    const { marketId, market, currentPrice, priceToBeat, countdown } =
      useCurrentCryptoUpDownMarketData({
        series,
        enabled,
        withChartData: false,
      });

    useImperativeHandle(ref, () => ({ marketId, market }), [market, marketId]);

    return (
      <>
        <BtcMarketValues
          currentPrice={currentPrice}
          priceToBeat={priceToBeat}
        />
        <HomepagePredictDiscoveryLivePill value={countdown} />
      </>
    );
  },
);

/**
 * Live BTC 5-minute up/down row (price + price-to-beat + countdown pill).
 *
 * Live state is isolated in `BtcLiveValues`. The row shell and icons remain
 * stable on countdown ticks, while memoized labels update only when their
 * respective values change.
 */
const BtcLiveRow = memo(({ series, onPress }: BtcLiveRowProps) => {
  const tw = useTailwind();
  const liveValuesRef = useRef<BtcLiveValuesHandle>(null);
  const rowRef = useRef<View>(null);
  const { isVisible, onLayout } = useSectionViewportVisible(rowRef);
  const [isVisibleForLive, setIsVisibleForLive] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setIsVisibleForLive(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsVisibleForLive(false);
    }, BTC_LIVE_DISCONNECT_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isVisible]);

  const handlePress = useCallback(() => {
    onPress(
      series,
      liveValuesRef.current?.marketId,
      liveValuesRef.current?.market,
    );
  }, [onPress, series]);

  return (
    <Pressable
      ref={rowRef}
      accessibilityRole="button"
      onPress={handlePress}
      onLayout={onLayout}
      style={tw.style(
        'w-full flex-row items-center self-stretch py-2 active:opacity-80',
      )}
      testID="homepage-predict-discovery-btc-row"
    >
      <Box twClassName="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <HomepagePredictDiscoveryMaterialGlyph name="currencyBitcoin" />
      </Box>
      <BtcLiveValues
        ref={liveValuesRef}
        series={series}
        isVisibleForLive={isVisibleForLive}
      />
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
});

export default BtcLiveRow;
