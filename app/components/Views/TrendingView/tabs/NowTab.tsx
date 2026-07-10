import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  FilterButton,
  SegmentedControl,
} from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
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
  PERPS_PRICE_CHANGE_SORT_DIRECTION,
  usePerpsFeed,
  type PerpsFeedItem,
  type PerpsPriceChangeDirection,
} from '../feeds/perps/usePerpsFeed';
import { usePerpsLiveMovers } from '../feeds/perps/usePerpsLiveMovers';
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
import ExploreSectionList, {
  type ExploreSectionItem,
} from '../components/ExploreSectionList';
import SectionHeader from '../components/SectionHeader';
import PillScrollList from '../components/PillScrollList';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';
import WhatsHappeningSection from '../../../UI/WhatsHappening';
import {
  MAX_ITEMS_DISPLAYED,
  WhatsHappeningSource,
} from '../../../UI/WhatsHappening/constants';
import {
  isWhatsHappeningSectionVisible,
  useWhatsHappening,
} from '../../../UI/WhatsHappening/hooks';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';

interface PerpsBlockProps {
  refresh: TabProps['refresh'];
  navigation: NavigationProp<PerpsNavigationParamList>;
}

// Matches PillScrollList's default maxPills — PerpsBlock doesn't override it,
// so the movers hook should rank/display exactly as many as will be shown.
const PERPS_MOVERS_MAX_COUNT = 12;

const PerpsBlock: React.FC<PerpsBlockProps> = ({ refresh, navigation }) => {
  const [activeMoverDirection, setActiveMoverDirection] =
    useState<PerpsPriceChangeDirection>('gainers');
  const perps = usePerpsFeed({
    variant: 'all',
    refresh,
    withTileExtras: false,
  });

  const handleMoverPillSelect = (key: string) => {
    if (key === 'gainers' || key === 'losers') {
      setActiveMoverDirection(key);
    }
  };

  // Observes live percent-change for every market on a ref between ticks and
  // only commits state when the displayed top-N (matches PillScrollList's
  // default maxPills) actually changes — see usePerpsLiveMovers for why this
  // is cheap despite watching the whole market set.
  const data = usePerpsLiveMovers({
    items: perps.data,
    direction: activeMoverDirection,
    maxCount: PERPS_MOVERS_MAX_COUNT,
  });
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
    <>
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
      <Box twClassName="px-4 mb-3">
        <SegmentedControl
          value={activeMoverDirection}
          onChange={handleMoverPillSelect}
          isFullWidth
          testID="perps-movers-pills"
        >
          <FilterButton value="gainers" testID="perps-movers-pill-gainers">
            {strings('trending.perps_movers_pill_gainers')}
          </FilterButton>
          <FilterButton value="losers" testID="perps-movers-pill-losers">
            {strings('trending.perps_movers_pill_losers')}
          </FilterButton>
        </SegmentedControl>
      </Box>
      <PillScrollList<PerpsFeedItem>
        data={pillData}
        isLoading={perps.isLoading}
        renderItem={(item, index) => (
          <PerpsPillItem
            item={item}
            marketDetailsSourceSection="perps_movers"
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
    </>
  );
};

const CRYPTO_MOVERS_TIME_OPTION = TimeOption.OneHour;
const CRYPTO_MOVERS_ROW_COUNT = 3;
const CRYPTO_MOVERS_MAX_PILLS = 18;

const NowTabContent: React.FC<TabProps> = ({
  refresh,
  refreshing,
  onRefresh,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isWhatsHappeningEnabled = useSelector(selectWhatsHappeningEnabled);

  const whatsHappening = useWhatsHappening(MAX_ITEMS_DISPLAYED);
  const refreshWhatsHappening = whatsHappening.refresh;

  useEffect(() => {
    if (refresh.trigger === 0) return;
    void refreshWhatsHappening();
  }, [refresh.trigger, refreshWhatsHappening]);

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
  const perpsFeed = usePerpsFeed({
    variant: 'all',
    refresh,
    withTileExtras: false,
  });
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

  const showWhatsHappening =
    isWhatsHappeningEnabled && isWhatsHappeningSectionVisible(whatsHappening);
  const showPredictions =
    isPredictEnabled &&
    (displayedPredictions.isLoading || displayedPredictions.data.length > 0);
  const showCryptoMovers =
    cryptoMovers.isLoading || cryptoMovers.data.length > 0;
  const showPerps =
    isPerpsEnabled && (perpsFeed.isLoading || perpsFeed.data.length > 0);
  const showStocks = stocks.isLoading || stocks.data.length > 0;

  const sections = useMemo((): ExploreSectionItem[] => {
    const items: ExploreSectionItem[] = [];

    if (showPredictions) {
      items.push({
        key: 'predict',
        content: (
          <PredictionsCarouselSection
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
        ),
      });
    }

    if (showCryptoMovers) {
      items.push({
        key: 'crypto_movers',
        content: (
          <>
            <SectionHeader
              title={strings('trending.crypto_movers')}
              onViewAll={() =>
                navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
                  initialTimeOption: CRYPTO_MOVERS_TIME_OPTION,
                  entryPoint: 'crypto_movers',
                  quickBuySource: 'explore_now',
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
          </>
        ),
      });
    }

    if (showPerps) {
      items.push({
        key: 'perps',
        content: <PerpsBlock refresh={refresh} navigation={perpsNavigation} />,
      });
    }

    if (showWhatsHappening) {
      items.push({
        key: 'wh',
        content: (
          <WhatsHappeningSection
            source={WhatsHappeningSource.Explore}
            feed={whatsHappening}
            tabName="Now"
            sectionName="whats_happening"
          />
        ),
      });
    }

    if (showStocks) {
      items.push({
        key: 'stocks',
        isVerticalList: true,
        content: (
          <>
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
          </>
        ),
      });
    }

    return items;
  }, [
    showWhatsHappening,
    showPredictions,
    showCryptoMovers,
    showPerps,
    showStocks,
    whatsHappening,
    displayedPredictions,
    worldCupPredictions.isEnabled,
    isPredictEnabled,
    navigation,
    cryptoMovers.data,
    cryptoMovers.isLoading,
    refresh,
    perpsNavigation,
    stocks.data,
    stocks.isLoading,
    renderTokenItem,
  ]);

  return (
    <ExploreScroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      testID={TrendingViewSelectorsIDs.EXPLORE_NOW_SCROLL_VIEW}
    >
      <ExploreSectionList sections={sections} />
    </ExploreScroll>
  );
};

const NowTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <NowTabContent {...props} />
  </PerpsSectionProvider>
);

export default NowTab;
