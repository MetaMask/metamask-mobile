import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { usePerpsLivePrices } from '../../../UI/Perps/hooks/stream';
import { formatPercentage } from '../../../UI/Perps/utils/formatUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { TokenRowItem } from '../feeds/tokens/TokenRowItem';
import CryptoMoversPillItem from '../feeds/tokens/CryptoMoversPillItem';
import CryptoMoversSkeleton from '../feeds/tokens/CryptoMoversSkeleton';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { TimeOption } from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import {
  filterAndSortByPriceChangeDirection,
  PERPS_PRICE_CHANGE_SORT_DIRECTION,
  usePerpsFeed,
  type PerpsFeedItem,
  type PerpsPriceChangeDirection,
} from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsPillItem from '../feeds/perps/PerpsPillItem';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import {
  navigateToExplorePredictionsList,
  navigateToExploreWorldCupPredictions,
} from '../feeds/predictions/predictionsNavigation';
import { useWorldCupPredictionsFeed } from '../feeds/predictions/useWorldCupPredictionsFeed';
import {
  STOCKS_FEED_PREVIEW_PAGE_SIZE,
  useStocksFeed,
} from '../feeds/stocks/useStocksFeed';
import { getCaipChainIdFromAssetId } from '../../../UI/Trending/components/TrendingTokenRowItem/utils';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import PillScrollList from '../components/PillScrollList';
import PillRow, { type PillOption } from '../components/PillRow';
import SectionHeader from '../components/SectionHeader';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';
import WhatsHappeningSection from '../../../UI/WhatsHappening';
import { WhatsHappeningSource } from '../../../UI/WhatsHappening/constants';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SectionRefreshHandle } from '../../Homepage/types';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';
import { useABTest } from '../../../../hooks';
import {
  WHATS_HAPPENING_EXPLORE_AB_KEY,
  WHATS_HAPPENING_EXPLORE_VARIANTS,
} from '../abTestConfig';

interface PerpsBlockProps {
  refresh: TabProps['refresh'];
  navigation: NavigationProp<PerpsNavigationParamList>;
}

const PerpsBlock: React.FC<PerpsBlockProps> = ({ refresh, navigation }) => {
  const [activeMoverDirection, setActiveMoverDirection] =
    useState<PerpsPriceChangeDirection>('gainers');
  const perps = usePerpsFeed({
    variant: 'all',
    refresh,
    withTileExtras: false,
  });

  const symbols = useMemo(
    () => perps.data.map(({ market }) => market.symbol),
    [perps.data],
  );
  const livePrices = usePerpsLivePrices({ symbols, throttleMs: 3000 });

  const moverPills: PillOption[] = [
    {
      key: 'gainers',
      name: strings('trending.perps_movers_pill_gainers'),
    },
    {
      key: 'losers',
      name: strings('trending.perps_movers_pill_losers'),
    },
  ];

  const handleMoverPillSelect = (key: string) => {
    if (key === 'gainers' || key === 'losers') {
      setActiveMoverDirection(key);
    }
  };

  const data = useMemo<PerpsFeedItem[]>(() => {
    const feedItemsBySymbol = new Map(
      perps.data.map((item) => [item.market.symbol, item]),
    );
    const marketsWithLivePrices = perps.data.map(({ market }) => {
      const livePrice = livePrices[market.symbol];
      if (!livePrice?.percentChange24h) {
        return market;
      }

      const changePercent = parseFloat(livePrice.percentChange24h);
      if (Number.isNaN(changePercent)) {
        return market;
      }

      return {
        ...market,
        change24hPercent: formatPercentage(changePercent),
      };
    });
    const markets = filterAndSortByPriceChangeDirection(
      marketsWithLivePrices,
      activeMoverDirection,
    );
    return markets
      .map((market) => {
        const item = feedItemsBySymbol.get(market.symbol);
        return item ? { ...item, market } : undefined;
      })
      .filter((item): item is PerpsFeedItem => item !== undefined);
  }, [activeMoverDirection, livePrices, perps.data]);
  const pillData =
    data.length === 0 &&
    perps.data.length > 0 &&
    perps.data.every(({ market }) =>
      Number.isNaN(parseFloat(market.change24hPercent)),
    )
      ? perps.data
      : data;

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <Box>
      <SectionHeader
        title={strings('trending.perps_movers')}
        onViewAll={() =>
          navigateToPerpsMarketList(
            navigation,
            'all',
            perps.defaultSortOptionId,
            {
              sortDirection:
                PERPS_PRICE_CHANGE_SORT_DIRECTION[activeMoverDirection],
            },
          )
        }
        testID="section-header-view-all-perps"
        tabName="Now"
        sectionName="perps_movers"
      />
      <PillRow
        pills={moverPills}
        activeKey={activeMoverDirection}
        onSelect={handleMoverPillSelect}
        testIdPrefix="perps-movers"
      />
      <PillScrollList<PerpsFeedItem>
        data={pillData}
        isLoading={perps.isLoading}
        renderItem={(item, index) => (
          <PerpsPillItem
            item={item}
            onCardPress={() =>
              trackExploreInteracted({
                interaction_type: 'section_item_tapped',
                tab_name: 'Now',
                section_name: 'perps_movers',
                asset_type: 'perp',
                position: index,
                item_clicked: item.market.symbol,
              })
            }
          />
        )}
        keyExtractor={(item) => item.market.symbol}
        Skeleton={CryptoMoversSkeleton}
        listTestId="explore-perps-pills-list"
      />
    </Box>
  );
};

const CRYPTO_MOVERS_TIME_OPTION = TimeOption.OneHour;
const CRYPTO_MOVERS_ROW_COUNT = 3;
const CRYPTO_MOVERS_MAX_PILLS = 18;

const NowTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isWhatsHappeningEnabled = useSelector(selectWhatsHappeningEnabled);
  const { variant: whatsHappeningExploreVariant } = useABTest(
    WHATS_HAPPENING_EXPLORE_AB_KEY,
    WHATS_HAPPENING_EXPLORE_VARIANTS,
  );

  const whatsHappeningRef = useRef<SectionRefreshHandle>(null);

  useEffect(() => {
    if (refresh.trigger === 0) return;
    whatsHappeningRef.current?.refresh();
  }, [refresh.trigger]);

  const worldCupPredictions = useWorldCupPredictionsFeed({
    enabled: isPredictEnabled,
    refresh,
  });
  const predictions = usePredictionsFeed({
    refresh,
    enabled: !worldCupPredictions.isEnabled,
  });
  const displayedPredictions = worldCupPredictions.isEnabled
    ? worldCupPredictions
    : predictions;
  const cryptoMovers = useTokensFeed({
    refresh,
    hideRiskyTokens: true,
    timeOption: CRYPTO_MOVERS_TIME_OPTION,
  });
  const stocks = useStocksFeed({
    refresh,
    pageSize: STOCKS_FEED_PREVIEW_PAGE_SIZE,
  });

  const renderTokenItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreNowStocks}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: 'Now',
            section_name: 'stocks',
            asset_type: 'stock',
            position: index,
            token_symbol: item.symbol,
            chain_id: getCaipChainIdFromAssetId(item.assetId),
            item_clicked: item.assetId,
          })
        }
      />
    ),
    [],
  );

  const showCryptoMovers =
    cryptoMovers.isLoading || cryptoMovers.data.length > 0;
  const showStocks = stocks.isLoading || stocks.data.length > 0;

  const whatsHappeningSection = isWhatsHappeningEnabled ? (
    <Box key="whats-happening" twClassName="-mx-4">
      <WhatsHappeningSection
        ref={whatsHappeningRef}
        source={WhatsHappeningSource.Explore}
      />
    </Box>
  ) : null;

  const predictionsSection = (
    <PredictionsCarouselSection
      key="predictions"
      feed={displayedPredictions}
      tabName="Now"
      sectionName="predictions_trending"
      title={
        worldCupPredictions.isEnabled
          ? strings('predict.world_cup.predictions_title')
          : strings('wallet.predict')
      }
      testIdPrefix="predict-market-row-item"
      idPrefix="predictions"
      onViewAll={() =>
        worldCupPredictions.isEnabled
          ? navigateToExploreWorldCupPredictions(navigation)
          : navigateToExplorePredictionsList(navigation, 'trending')
      }
      isEnabled={isPredictEnabled}
    />
  );

  const orderedIntroSections =
    whatsHappeningExploreVariant.whatsHappeningBeforePredict
      ? [whatsHappeningSection, predictionsSection]
      : [predictionsSection, whatsHappeningSection];

  return (
    <ExploreScroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      testID={TrendingViewSelectorsIDs.EXPLORE_NOW_SCROLL_VIEW}
    >
      {orderedIntroSections}

      {showCryptoMovers && (
        <Box>
          <SectionHeader
            title={strings('trending.crypto_movers')}
            onViewAll={() =>
              navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
                initialTimeOption: CRYPTO_MOVERS_TIME_OPTION,
              })
            }
            testID="section-header-view-all-crypto_movers"
            tabName="Now"
            sectionName="tokens_movers"
          />
          <PillScrollList<TrendingAsset>
            data={cryptoMovers.data}
            isLoading={cryptoMovers.isLoading}
            renderItem={(token, index) => (
              <CryptoMoversPillItem
                token={token}
                index={index}
                timeOption={CRYPTO_MOVERS_TIME_OPTION}
                onCardPress={() =>
                  trackExploreInteracted({
                    interaction_type: 'section_item_tapped',
                    tab_name: 'Now',
                    section_name: 'tokens_movers',
                    asset_type: 'token',
                    position: index,
                    token_symbol: token.symbol,
                    chain_id: getCaipChainIdFromAssetId(token.assetId),
                    item_clicked: token.assetId,
                  })
                }
              />
            )}
            keyExtractor={(token) => token.assetId ?? ''}
            Skeleton={CryptoMoversSkeleton}
            listTestId="explore-crypto_movers-pills-list"
            rowCount={CRYPTO_MOVERS_ROW_COUNT}
            maxPills={CRYPTO_MOVERS_MAX_PILLS}
          />
        </Box>
      )}

      {isPerpsEnabled && (
        <PerpsSectionProvider>
          <PerpsBlock refresh={refresh} navigation={perpsNavigation} />
        </PerpsSectionProvider>
      )}

      {showStocks && (
        <Box>
          <SectionHeader
            title={strings('trending.stocks')}
            onViewAll={() =>
              navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW)
            }
            testID="section-header-view-all-stocks"
            tabName="Now"
            sectionName="stocks"
          />
          <CardList<TrendingAsset>
            data={stocks.data}
            isLoading={stocks.isLoading}
            renderItem={renderTokenItem}
            Skeleton={TrendingTokensSkeleton}
            idPrefix="stocks"
          />
        </Box>
      )}
    </ExploreScroll>
  );
};

export default NowTab;
