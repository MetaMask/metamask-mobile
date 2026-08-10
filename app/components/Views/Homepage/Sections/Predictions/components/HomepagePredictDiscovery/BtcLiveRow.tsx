import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
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
import type { PredictMarket } from '../../../../../../UI/Predict/types';
import { HOMEPAGE_PREDICT_SERIES_SLOT } from '../../constants/homepagePredictMarketSlots';
import HomepagePredictDiscoveryMaterialGlyph from './HomepagePredictDiscoveryMaterialGlyph';
import HomepagePredictDiscoveryLivePill from './HomepagePredictDiscoveryLivePill';

const formatBtc = (value: number | undefined) =>
  value === undefined || Number.isNaN(value)
    ? '\u2014'
    : formatPrice(value, { maximumDecimals: 0 });

interface BtcLiveRowProps {
  onPress: (
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

const BtcLiveValues = forwardRef<BtcLiveValuesHandle>((_props, ref) => {
  const { marketId, market, currentPrice, priceToBeat, countdown } =
    useCurrentCryptoUpDownMarketData({
      series: HOMEPAGE_PREDICT_SERIES_SLOT.series,
    });

  useImperativeHandle(ref, () => ({ marketId, market }), [market, marketId]);

  return (
    <>
      <BtcMarketValues currentPrice={currentPrice} priceToBeat={priceToBeat} />
      <HomepagePredictDiscoveryLivePill value={countdown} />
    </>
  );
});

/**
 * Live BTC 5-minute up/down row (price + price-to-beat + countdown pill).
 *
 * Live state is isolated in `BtcLiveValues`. The row shell and icons remain
 * stable on countdown ticks, while memoized labels update only when their
 * respective values change.
 */
const BtcLiveRow = memo(({ onPress }: BtcLiveRowProps) => {
  const tw = useTailwind();
  const liveValuesRef = useRef<BtcLiveValuesHandle>(null);
  const handlePress = useCallback(() => {
    onPress(liveValuesRef.current?.marketId, liveValuesRef.current?.market);
  }, [onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={tw.style(
        'w-full flex-row items-center self-stretch py-2 active:opacity-80',
      )}
      testID="homepage-predict-discovery-btc-row"
    >
      <Box twClassName="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <HomepagePredictDiscoveryMaterialGlyph name="currencyBitcoin" />
      </Box>
      <BtcLiveValues ref={liveValuesRef} />
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
});

export default BtcLiveRow;
