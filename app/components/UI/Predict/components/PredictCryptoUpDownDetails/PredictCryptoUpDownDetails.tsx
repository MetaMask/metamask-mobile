import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import TitleSubpage from '../../../../../component-library/components-temp/TitleSubpage';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
  type PredictSeries,
} from '../../types';
import { formatMarketEndDate } from '../../utils/format';
import usePredictShare from '../../hooks/usePredictShare';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import {
  RECURRENCE_TO_DURATION_SECS,
  getCryptoSymbol,
  getEventStartTime,
  getVariant,
} from '../../utils/cryptoUpDown';
import { TimeSlotPicker } from '../TimeSlotPicker';
import { findLiveMarket } from '../TimeSlotPicker/TimeSlotPicker.utils';
import PredictCryptoUpDownChart from '../PredictCryptoUpDownChart';
import PredictMarketDetailsActions from '../../views/PredictMarketDetails/components/PredictMarketDetailsActions';

const CHART_HEIGHT_MIN = 330;
const CHART_HEIGHT_MAX = 430;
const NOOP = () => undefined;
const DEFAULT_CRYPTO_ACCENT_COLOR = 'rgb(245, 158, 11)';
const CRYPTO_SYMBOL_TO_ACCENT_COLOR: Record<string, string> = {
  BTC: 'rgb(247, 147, 26)',
};

const formatUsdPrice = (price: number | undefined) => {
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return '--';
  }

  const [whole, decimals] = Math.abs(price).toFixed(2).split('.');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = price < 0 ? '-$' : '$';
  return `${prefix}${formattedWhole}.${decimals}`;
};

const formatSignedUsdPrice = (price: number | undefined) => {
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return undefined;
  }

  const prefix = price >= 0 ? '+' : '-';
  return `${prefix}${formatUsdPrice(Math.abs(price))}`;
};

const getOpenOutcomes = (market: PredictMarket): PredictOutcome[] =>
  market.outcomes.filter(
    (outcome) => outcome.status === PredictMarketStatus.OPEN,
  );

const getYesPercentage = (
  market: PredictMarket,
  openOutcomes: PredictOutcome[],
) => {
  const firstOpenOutcome = openOutcomes[0];
  const firstTokenPrice = firstOpenOutcome?.tokens?.[0]?.price;

  if (typeof firstTokenPrice === 'number') {
    return Math.round(firstTokenPrice * 100);
  }

  const firstOutcomePrice = market.outcomes?.[0]?.tokens?.[0]?.price;
  if (typeof firstOutcomePrice === 'number') {
    return Math.round(firstOutcomePrice * 100);
  }

  return 0;
};

export interface PredictCryptoUpDownDetailsProps {
  market: PredictMarket & { series: PredictSeries };
  onBack: () => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  onBetPress?: (
    token: PredictOutcomeToken,
    market?: PredictMarket & { series: PredictSeries },
  ) => void;
  onClaimPress?: () => void;
  isClaimablePositionsLoading?: boolean;
  hasPositivePnl?: boolean;
  isMarketLoading?: boolean;
  isClaimPending?: boolean;
}

const PredictCryptoUpDownDetails: React.FC<PredictCryptoUpDownDetailsProps> = ({
  market,
  onBack,
  onBetPress,
  onClaimPress,
  isClaimablePositionsLoading = false,
  hasPositivePnl = false,
  isMarketLoading = false,
  isClaimPending = false,
}) => {
  const tw = useTailwind();
  const { height: windowHeight } = useWindowDimensions();
  const chartAreaHeight = Math.min(
    CHART_HEIGHT_MAX,
    Math.max(CHART_HEIGHT_MIN, Math.round(windowHeight * 0.45)),
  );
  const [selectedMarket, setSelectedMarket] = useState<
    PredictMarket & { series: PredictSeries }
  >(market);
  const [currentPrice, setCurrentPrice] = useState<number>();

  const { handleSharePress } = usePredictShare({
    marketId: selectedMarket.id,
    marketSlug: selectedMarket.slug,
  });

  const recurrence = market.series.recurrence;
  const durationMs = (RECURRENCE_TO_DURATION_SECS[recurrence] ?? 5 * 60) * 1000;
  const endDateMs = market.endDate
    ? new Date(market.endDate).getTime()
    : Date.now();
  const endDateMin = new Date(endDateMs - 3 * durationMs).toISOString();
  const endDateMax = new Date(endDateMs + 10 * durationMs).toISOString();

  const { data: seriesMarkets } = usePredictSeries({
    seriesId: market.series.id,
    endDateMin,
    endDateMax,
  });

  const targetPriceSymbol = getCryptoSymbol(selectedMarket);
  const targetPriceEventStartTime = getEventStartTime(
    selectedMarket.endDate,
    selectedMarket.series.recurrence,
  );
  const { data: targetPrice } = useCryptoTargetPrice({
    eventId: selectedMarket.id,
    symbol: targetPriceSymbol ?? '',
    eventStartTime: targetPriceEventStartTime ?? '',
    variant: getVariant(selectedMarket.series.recurrence),
    endDate: selectedMarket.endDate ?? '',
    enabled:
      !!targetPriceSymbol &&
      !!targetPriceEventStartTime &&
      !!selectedMarket.endDate,
  });

  const selectedOpenOutcomes = useMemo(
    () => getOpenOutcomes(selectedMarket),
    [selectedMarket],
  );
  const selectedYesPercentage = useMemo(
    () => getYesPercentage(selectedMarket, selectedOpenOutcomes),
    [selectedMarket, selectedOpenOutcomes],
  );

  const handleCurrentPriceChange = useCallback((value: number) => {
    setCurrentPrice(value);
  }, []);

  const handleBuyPress = useCallback(
    (token: PredictOutcomeToken) => {
      onBetPress?.(token, selectedMarket);
    },
    [onBetPress, selectedMarket],
  );

  useEffect(() => {
    setCurrentPrice(undefined);
  }, [selectedMarket.id]);

  // Once the series markets load, auto-advance to the live slot if the current
  // selectedMarket has a known endDate that has already passed
  // (e.g. user tapped an expired card in the market list).
  useEffect(() => {
    if (!seriesMarkets?.length) return;
    const hasEnded =
      selectedMarket.endDate &&
      Date.now() >= new Date(selectedMarket.endDate).getTime();
    if (!hasEnded) return;
    const liveMarket = findLiveMarket(seriesMarkets);
    if (liveMarket) {
      setSelectedMarket(
        liveMarket as PredictMarket & { series: PredictSeries },
      );
    }
  }, [seriesMarkets]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = selectedMarket.series.title;
  const subtitle = selectedMarket.endDate
    ? formatMarketEndDate(selectedMarket.endDate)
    : undefined;
  const currentPriceDelta =
    typeof currentPrice === 'number' && typeof targetPrice === 'number'
      ? currentPrice - targetPrice
      : undefined;
  const currentPriceDeltaColor =
    typeof currentPriceDelta === 'number' && currentPriceDelta >= 0
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;
  const currentPriceAccentColor =
    CRYPTO_SYMBOL_TO_ACCENT_COLOR[targetPriceSymbol ?? ''] ??
    DEFAULT_CRYPTO_ACCENT_COLOR;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'top']}
      testID={PredictCryptoUpDownDetailsSelectorsIDs.SCREEN}
    >
      <HeaderCompactStandard
        onBack={onBack}
        backButtonProps={{
          testID: PredictCryptoUpDownDetailsSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Share,
            onPress: handleSharePress,
            testID: PredictCryptoUpDownDetailsSelectorsIDs.SHARE_BUTTON,
          },
        ]}
        testID={PredictCryptoUpDownDetailsSelectorsIDs.HEADER}
      />

      <Box testID={PredictCryptoUpDownDetailsSelectorsIDs.TITLE_SECTION}>
        <TitleSubpage
          startAccessory={
            <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
              {selectedMarket.image ? (
                <Image
                  source={{ uri: selectedMarket.image }}
                  style={tw.style('w-full h-full')}
                  resizeMode="cover"
                />
              ) : (
                <Box twClassName="w-full h-full bg-muted" />
              )}
            </Box>
          }
          title={title}
          bottomLabel={subtitle}
          twClassName="px-4 pt-1 pb-3"
        />
      </Box>

      <TimeSlotPicker
        markets={seriesMarkets ?? []}
        selectedMarketId={selectedMarket.id}
        onMarketSelected={(m) =>
          setSelectedMarket(m as PredictMarket & { series: PredictSeries })
        }
      />

      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="px-4 pt-5 gap-4"
        testID={PredictCryptoUpDownDetailsSelectorsIDs.PRICE_SUMMARY}
      >
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Price to beat
          </Text>
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {formatUsdPrice(targetPrice)}
          </Text>
        </Box>
        <Box twClassName="flex-1">
          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              style={tw.style({ color: currentPriceAccentColor })}
            >
              Current price
            </Text>
            {currentPriceDelta !== undefined && (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={currentPriceDeltaColor}
              >
                {formatSignedUsdPrice(currentPriceDelta)}
              </Text>
            )}
          </Box>
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Medium}
            style={tw.style({ color: currentPriceAccentColor })}
          >
            {formatUsdPrice(currentPrice)}
          </Text>
        </Box>
      </Box>

      <Box twClassName="px-4 pt-3">
        <PredictCryptoUpDownChart
          market={selectedMarket}
          targetPrice={targetPrice}
          onCurrentPriceChange={handleCurrentPriceChange}
          height={chartAreaHeight}
        />
      </Box>

      {onBetPress && (
        <Box twClassName="px-4 pb-4">
          <PredictMarketDetailsActions
            isClaimablePositionsLoading={isClaimablePositionsLoading}
            hasPositivePnl={hasPositivePnl}
            marketStatus={selectedMarket.status as PredictMarketStatus}
            singleOutcomeMarket={selectedMarket.outcomes.length === 1}
            isMarketLoading={isMarketLoading}
            market={selectedMarket}
            openOutcomes={selectedOpenOutcomes}
            yesPercentage={selectedYesPercentage}
            onClaimPress={onClaimPress ?? NOOP}
            onBuyPress={handleBuyPress}
            isClaimPending={isClaimPending}
            showPayoutEstimate
          />
        </Box>
      )}
    </SafeAreaView>
  );
};

export default PredictCryptoUpDownDetails;
