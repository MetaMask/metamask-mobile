import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  AvatarBase,
  AvatarBaseSize,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import type { Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';
import { strings } from '../../../../../locales/i18n';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import { chainNameToId } from '../utils/chainMapping';
import {
  getAssetImageUrl,
  toAssetId,
} from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { formatUsd, formatPercent, formatTradeDate } from '../utils/formatters';
import {
  formatSignedUsd,
  formatCompactUsd,
  caipChainIdToHex,
} from '../../../UI/Rewards/utils/formatUtils';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Logger from '../../../../util/Logger';
import PriceChart from '../../../UI/AssetOverview/PriceChart';
import { PriceChartProvider } from '../../../UI/AssetOverview/PriceChart/PriceChart.context';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_PERIODS = ['1H', '1D', '1W', '1M', 'All'] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

// Maps UI time period labels to the historical-prices API params.
// `timePeriod` controls the date range, `interval` controls data point granularity.
// 1H fetches 1d of 5-minute data; derivePercentChange picks the point closest to T-1h.
const PERIOD_CONFIG: Record<
  TimePeriod,
  { timePeriod: string; interval: string }
> = {
  '1H': { timePeriod: '1d', interval: '5m' },
  '1D': { timePeriod: '1d', interval: 'hourly' },
  '1W': { timePeriod: '7d', interval: 'daily' },
  '1M': { timePeriod: '1m', interval: 'daily' },
  All: { timePeriod: '1y', interval: 'daily' },
};

/**
 * Derives percentage change from historical price data points.
 *
 * We compute this ourselves rather than relying on pre-computed fields from
 * the spot-prices API because most social leaderboard tokens (small-cap /
 * meme tokens) are not indexed there — the API returns null for them. The
 * historical-prices endpoint covers a wider set of tokens, so we fetch the
 * price series and calculate: (endPrice - startPrice) / startPrice * 100.
 *
 * For the "1H" period we use the 1-day data set and find the point closest
 * to one hour ago, since the historical-prices API has no sub-day period.
 */
function derivePercentChange(
  prices: TokenPrice[],
  period: TimePeriod,
): number | undefined {
  if (!prices.length) return undefined;

  const endPrice = prices[prices.length - 1][1];
  let startPrice: number;

  if (period === '1H') {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const closest = prices.reduce((best, pt) =>
      Math.abs(Number(pt[0]) - oneHourAgo) <
      Math.abs(Number(best[0]) - oneHourAgo)
        ? pt
        : best,
    );
    startPrice = closest[1];
  } else {
    startPrice = prices[0][1];
  }

  if (startPrice === 0) return undefined;
  return ((endPrice - startPrice) / startPrice) * 100;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TimePeriodButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TimePeriodButton: React.FC<TimePeriodButtonProps> = ({
  label,
  isActive,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      twClassName={`flex-1 items-center justify-center px-2 py-1 rounded ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

interface TradeRowProps {
  trade: Trade;
  traderName: string;
}

const TradeRow: React.FC<TradeRowProps> = ({ trade, traderName }) => {
  const isEntry = trade.intent === 'enter';
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3"
      testID={`trade-row-${trade.transactionHash}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="flex-1 min-w-0 mr-3"
      >
        <AvatarBase
          size={AvatarBaseSize.Md}
          fallbackText={traderName.charAt(0).toUpperCase()}
        />
        <Box twClassName="flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {isEntry
              ? strings('social_leaderboard.trader_position.bought', {
                  name: traderName,
                })
              : strings('social_leaderboard.trader_position.sold', {
                  name: traderName,
                })}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {formatTradeDate(trade.timestamp)}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={isEntry ? 'text-success-default' : 'text-error-default'}
        >
          {formatUsd(isEntry ? trade.usdCost : -trade.usdCost)}
        </Text>
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderPositionView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderPositionView'>>();
  const tw = useTailwind();

  const { traderName, tokenSymbol, position: positionParam } = route.params;

  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>('1D');

  const caipChainId = useMemo(
    () => (positionParam ? chainNameToId(positionParam.chain) : undefined),
    [positionParam],
  );

  const hexChainId = useMemo(
    () => (caipChainId ? caipChainIdToHex(caipChainId) : undefined),
    [caipChainId],
  );

  const tokenImageUrl = useMemo(() => {
    if (!positionParam || !caipChainId) return undefined;
    return getAssetImageUrl(positionParam.tokenAddress, caipChainId);
  }, [positionParam, caipChainId]);

  // Try cache first (TokenRatesController), then fetch from price API
  const allMarketData = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const cachedMarket = hexChainId
    ? allMarketData?.[hexChainId]?.[
        positionParam?.tokenAddress?.toLowerCase() as Hex
      ]
    : undefined;

  // Fetch market cap from spot-prices API (cache miss fallback)
  const [fetchedMarketCap, setFetchedMarketCap] = useState<number>();

  useEffect(() => {
    if (cachedMarket?.marketCap || !positionParam || !caipChainId) return;
    const assetId = toAssetId(positionParam.tokenAddress, caipChainId);
    if (!assetId) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
          {
            assetIds: assetId,
            includeMarketData: 'true',
            vsCurrency: currentCurrency.toLowerCase(),
          },
        )}`;
        const response = (await handleFetch(url)) as Record<
          string,
          Record<string, unknown>
        >;
        const cap = response?.[assetId]?.marketCap;
        if (!cancelled && typeof cap === 'number') {
          setFetchedMarketCap(cap);
        }
      } catch (err) {
        Logger.error(
          err as Error,
          'TraderPositionView: failed to fetch market data',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cachedMarket?.marketCap, positionParam, caipChainId, currentCurrency]);

  const marketCap = cachedMarket?.marketCap ?? fetchedMarketCap;

  // Fetch historical prices for ALL time periods on mount so tab switching
  // is instant. Each period fires in parallel; results land as they resolve.
  const [allPrices, setAllPrices] = useState<
    Partial<Record<TimePeriod, TokenPrice[]>>
  >({});
  const [isPricesLoading, setIsPricesLoading] = useState(true);

  useEffect(() => {
    if (!positionParam || !caipChainId) return;
    setIsPricesLoading(true);
    const assetIdentifier = `erc20:${positionParam.tokenAddress}`;
    const vsCurrency = currentCurrency.toLowerCase();
    let cancelled = false;

    const fetchPeriod = async (period: TimePeriod) => {
      const { timePeriod, interval } = PERIOD_CONFIG[period];
      const uri = `https://price.api.cx.metamask.io/v3/historical-prices/${caipChainId}/${assetIdentifier}?timePeriod=${timePeriod}&interval=${interval}&vsCurrency=${vsCurrency}`;
      try {
        const response = await fetch(uri);
        if (response.status === 204 || !response.ok)
          return { period, prices: [] as TokenPrice[] };
        const data: { prices: TokenPrice[] } = await response.json();
        return { period, prices: data.prices ?? [] };
      } catch (err) {
        Logger.error(
          err as Error,
          `TraderPositionView: failed to fetch ${period} prices`,
        );
        return { period, prices: [] as TokenPrice[] };
      }
    };

    Promise.all(TIME_PERIODS.map(fetchPeriod)).then((results) => {
      if (cancelled) return;
      const cache: Partial<Record<TimePeriod, TokenPrice[]>> = {};
      for (const { period, prices } of results) {
        cache[period] = prices;
      }
      setAllPrices(cache);
      setIsPricesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [positionParam, caipChainId, currentCurrency]);

  // For 1H, truncate the 1d/5m data to the last 60 minutes since the
  // historical-prices API doesn't support a 1-hour time period directly.
  const historicalPrices = useMemo(() => {
    const prices = allPrices[activeTimePeriod] ?? [];
    if (activeTimePeriod !== '1H' || !prices.length) return prices;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return prices.filter((pt) => Number(pt[0]) >= oneHourAgo);
  }, [allPrices, activeTimePeriod]);

  const priceDiff = useMemo(() => {
    if (historicalPrices.length < 2) return 0;
    return (
      historicalPrices[historicalPrices.length - 1][1] - historicalPrices[0][1]
    );
  }, [historicalPrices]);

  const handleChartIndexChange = useCallback((_index: number) => {
    // Future: update displayed price on scrub
  }, []);

  const pricePercentChange = derivePercentChange(
    historicalPrices,
    activeTimePeriod,
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const symbol = positionParam?.tokenSymbol ?? tokenSymbol;
  const positionValue = positionParam?.currentValueUSD;
  const pnlValue = positionParam?.pnlValueUsd;
  const pnlPercent = positionParam?.pnlPercent;
  const isPnlPositive = (pnlValue ?? 0) >= 0;
  const trades = positionParam?.trades ?? [];

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      {/* Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <Box twClassName="w-10" />
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {traderName}
        </Text>
        <Box twClassName="w-10 items-end">
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={TraderPositionViewSelectorsIDs.CLOSE_BUTTON}
          />
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        {/* Token Info Row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={4}
            twClassName="flex-1 min-w-0 mr-3"
          >
            <AvatarToken
              name={symbol}
              src={tokenImageUrl ? { uri: tokenImageUrl } : undefined}
              size={AvatarTokenSize.Lg}
            />
            <Box twClassName="flex-1 min-w-0">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {symbol}
              </Text>
              {pricePercentChange != null ? (
                <Text
                  variant={TextVariant.BodySm}
                  twClassName={
                    pricePercentChange >= 0
                      ? 'text-success-default'
                      : 'text-error-default'
                  }
                  numberOfLines={1}
                >
                  {`${pricePercentChange >= 0 ? '+' : ''}${pricePercentChange.toFixed(1)}% `}
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {activeTimePeriod}
                  </Text>
                </Text>
              ) : (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {'\u2014'}
                </Text>
              )}
            </Box>
          </Box>

          <Box alignItems={BoxAlignItems.End}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {marketCap != null ? formatCompactUsd(marketCap) : '\u2014'}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.trader_position.market_cap')}
            </Text>
          </Box>
        </Box>

        {/* Price Chart */}
        <PriceChartProvider>
          <Box twClassName="mx-4 my-3">
            <PriceChart
              prices={historicalPrices}
              priceDiff={priceDiff}
              isLoading={isPricesLoading}
              onChartIndexChange={handleChartIndexChange}
            />
          </Box>
        </PriceChartProvider>

        {/* Timeline Selector */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 pb-3"
          gap={3}
        >
          {TIME_PERIODS.map((period) => (
            <TimePeriodButton
              key={period}
              label={period}
              isActive={activeTimePeriod === period}
              onPress={() => setActiveTimePeriod(period)}
            />
          ))}
        </Box>

        {/* Position Card */}
        <Box twClassName="mx-4 p-4 bg-muted rounded-2xl">
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Start}
          >
            <Box>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {formatUsd(positionValue)}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('social_leaderboard.trader_position.position')}
              </Text>
            </Box>
            <Box alignItems={BoxAlignItems.End}>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                twClassName={
                  isPnlPositive ? 'text-success-default' : 'text-error-default'
                }
              >
                {pnlValue != null
                  ? formatSignedUsd(String(pnlValue))
                  : '\u2014'}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {formatPercent(pnlPercent)}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Trades Tab Header */}
        <Box twClassName="px-4 mt-5">
          <Box twClassName="self-start pb-2 border-b-2 border-white">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('social_leaderboard.trader_position.trades')}
            </Text>
          </Box>
          <Box twClassName="h-px bg-muted -mt-0.5" />
        </Box>

        {/* Trade History */}
        {trades.length > 0 ? (
          trades.map((trade) => (
            <TradeRow
              key={trade.transactionHash}
              trade={trade}
              traderName={traderName}
            />
          ))
        ) : (
          <Box twClassName="px-4 py-6 items-center">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.trader_position.no_trades')}
            </Text>
          </Box>
        )}
      </ScrollView>

      {/* Buy Button — pinned at bottom */}
      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          isFullWidth
          onPress={() => undefined}
          testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
        >
          {strings('social_leaderboard.trader_position.buy')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default TraderPositionView;
