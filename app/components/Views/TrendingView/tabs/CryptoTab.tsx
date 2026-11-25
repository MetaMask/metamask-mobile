import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { strings } from '../../../../../locales/i18n';
import ExploreEarnSection from '../components/ExploreEarnSection';
import { usePerpsFeed, type PerpsFeedItem } from '../feeds/perps/usePerpsFeed';
import type { SortOptionId } from '@metamask/perps-controller';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsTileRowItem from '../feeds/perps/PerpsTileRowItem';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import PerpsMarketTileCardSkeleton from '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import {
  PredictTrendingCarousel,
  usePredictEntryActions,
  usePredictTrendingFeed,
} from '../../../UI/PredictNext';
import ExploreScroll from '../components/ExploreScroll';
import ExploreSectionList, {
  type ExploreSectionItem,
} from '../components/ExploreSectionList';
import SectionHeader from '../components/SectionHeader';
import TileCarousel from '../components/TileCarousel';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TopTradersSection from '../../Homepage/Sections/TopTraders/TopTradersSection';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import CryptoTokensPillBlock from '../feeds/tokens/CryptoTokensPillBlock';
import {
  getEffectiveActiveCryptoPillKey,
  getSelectableCryptoPills,
  getVisibleCryptoPills,
  useCryptoPillFeed,
} from '../feeds/tokens/useCryptoPillFeed';
import {
  getCryptoPillOrder,
  type CryptoPillKey,
} from '../feeds/tokens/cryptoPillConfig';
import { selectTokenWatchlistEnabled } from '../../../UI/Assets/selectors/featureFlags';
import { useTrendingQuickBuySheet } from '../../../UI/Trending/contexts';
import { useABTest } from '../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../search/abTestConfig';
import { selectIsExploreEarnSectionVisible } from '../../../UI/Earn/selectors/visibility';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import type { TrendingAsset } from '@metamask/assets-controllers';

const styles = StyleSheet.create({
  container: { flex: 1 },
});

interface CryptoPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (sortOptionId: SortOptionId) => void;
}

const CryptoPerpsBlock: React.FC<CryptoPerpsBlockProps> = ({
  refresh,
  onViewAll,
}) => {
  const perps = usePerpsFeed({
    variant: 'crypto',
    refresh,
    withTileExtras: true,
  });
  const [hardwareTier] = useState(() => getHardwareTier());
  const networkTier = useNetworkTier();
  const deviceCapability = useMemo(
    () => ({ hardwareTier, networkTier }),
    [hardwareTier, networkTier],
  );

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <>
      <SectionHeader
        title={strings('trending.crypto_perps_section')}
        onViewAll={() => onViewAll(perps.defaultSortOptionId)}
        testID="section-header-view-all-crypto_perps"
        tabName="Crypto"
        sectionName="perps_crypto"
      />
      <TileCarousel<PerpsFeedItem>
        data={perps.data}
        isLoading={perps.isLoading}
        renderItem={(item, index) => (
          <PerpsTileRowItem
            item={item}
            testIdPrefix="crypto-tab-perps-market-tile-card"
            sourceSection="perps_crypto"
            deviceCapability={deviceCapability}
            onCardPress={() =>
              trackExploreInteracted({
                interaction_type: 'section_item_tapped',
                tab_name: 'Crypto',
                section_name: 'perps_crypto',
                asset_type: 'perp',
                position: index,
                item_clicked: item.market.symbol,
              })
            }
          />
        )}
        keyExtractor={(item) => item.market.symbol}
        Skeleton={PerpsMarketTileCardSkeleton}
        onViewMore={() => onViewAll(perps.defaultSortOptionId)}
        testID="explore-crypto_perps-carousel"
        viewMoreTestID="crypto_perps-view-more-card"
      />
    </>
  );
};

const CryptoTabContent: React.FC<TabProps> = ({
  refresh,
  refreshing,
  onRefresh,
}) => {
  const { openPredict } = usePredictEntryActions();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isEarnSectionVisible = useSelector(selectIsExploreEarnSectionVisible);
  const isTopTradersEnabled = useSelector(selectSocialLeaderboardEnabled);
  const networkTier = useNetworkTier();
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const showTopTraders = isTopTradersEnabled && networkTier !== 'NONE';
  const prefetchTraderProfiles = !(
    hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR'
  );
  const { openQuickBuy } = useTrendingQuickBuySheet();

  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );

  const tokensOnQuickTrade = useCallback(
    (token: TrendingAsset) => openQuickBuy(token, 'explore_crypto'),
    [openQuickBuy],
  );
  const cryptoPredictions = usePredictTrendingFeed({
    tab: 'crypto',
    refresh,
  });
  const cryptoPerps = usePerpsFeed({
    variant: 'crypto',
    refresh,
    withTileExtras: true,
  });

  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const [activeCryptoPillKey, setActiveCryptoPillKey] =
    useState<CryptoPillKey>();
  const [feedActivePillKey, setFeedActivePillKey] = useState<CryptoPillKey>();
  const defaultCryptoPillKey = useMemo(
    () => getCryptoPillOrder(isWatchlistEnabled)[0]?.key ?? 'trending',
    [isWatchlistEnabled],
  );
  const tokensFeed = useCryptoPillFeed({
    activePillKey: feedActivePillKey ?? defaultCryptoPillKey,
    refresh,
  });
  const visibleCryptoPills = useMemo(
    () => getVisibleCryptoPills(tokensFeed.results, isWatchlistEnabled),
    [tokensFeed.results, isWatchlistEnabled],
  );
  const selectableCryptoPills = useMemo(
    () => getSelectableCryptoPills(tokensFeed.results, isWatchlistEnabled),
    [tokensFeed.results, isWatchlistEnabled],
  );
  const showTokensSection = visibleCryptoPills.length > 0;
  const effectiveActiveCryptoPillKey = getEffectiveActiveCryptoPillKey(
    activeCryptoPillKey,
    visibleCryptoPills,
    defaultCryptoPillKey,
    selectableCryptoPills,
  );
  useEffect(() => {
    setFeedActivePillKey(effectiveActiveCryptoPillKey);
  }, [effectiveActiveCryptoPillKey]);

  const showCryptoPerps =
    isPerpsEnabled && (cryptoPerps.isLoading || cryptoPerps.data.length > 0);
  const showPredictions =
    cryptoPredictions.isLoading || cryptoPredictions.data.length > 0;

  const sections = useMemo((): ExploreSectionItem[] => {
    const items: ExploreSectionItem[] = [];

    if (showTokensSection) {
      items.push({
        key: 'tokens',
        isVerticalList: true,
        content: (
          <CryptoTokensPillBlock
            title={strings('trending.crypto_tokens_section')}
            activePillKey={activeCryptoPillKey}
            onActivePillChange={setActiveCryptoPillKey}
            onQuickTrade={
              quickBuyVariant.showQuickTradeButton
                ? tokensOnQuickTrade
                : undefined
            }
            tabName="Crypto"
            headerTestID="section-header-view-all-tokens"
            idPrefix="tokens"
            testIdPrefix="crypto-tokens"
            listTestId="crypto-tokens-list"
          />
        ),
      });
    }

    if (showCryptoPerps) {
      items.push({
        key: 'crypto_perps',
        content: (
          <CryptoPerpsBlock
            refresh={refresh}
            onViewAll={(sortOptionId) =>
              navigateToPerpsMarketList(perpsNavigation, 'crypto', sortOptionId)
            }
          />
        ),
      });
    }

    if (isEarnSectionVisible) {
      items.push({
        key: 'earn',
        content: <ExploreEarnSection tabName="Crypto" refresh={refresh} />,
      });
    }

    if (showPredictions) {
      items.push({
        key: 'predictions',
        content: (
          <PredictTrendingCarousel
            feed={cryptoPredictions}
            tabName="Crypto"
            sectionName="predictions_crypto"
            title={strings('trending.predictions')}
            testIdPrefix="predict-crypto-market-row-item"
            idPrefix="crypto_predictions"
            onViewAll={() =>
              navigateToExplorePredictionsList(openPredict, 'crypto')
            }
          />
        ),
      });
    }

    return items;
  }, [
    showTokensSection,
    activeCryptoPillKey,
    showCryptoPerps,
    isEarnSectionVisible,
    showPredictions,
    quickBuyVariant.showQuickTradeButton,
    tokensOnQuickTrade,
    refresh,
    perpsNavigation,
    cryptoPredictions,
    openPredict,
  ]);

  return (
    <View style={styles.container}>
      <ExploreScroll
        refreshing={refreshing}
        onRefresh={onRefresh}
        testID={TrendingViewSelectorsIDs.EXPLORE_CRYPTO_SCROLL_VIEW}
      >
        {showTopTraders && (
          <>
            <Box twClassName="pb-1">
              <TopTradersSection
                source="explore_crypto"
                prefetchProfiles={prefetchTraderProfiles}
              />
            </Box>
            <SectionDivider />
          </>
        )}
        <ExploreSectionList sections={sections} />
      </ExploreScroll>
    </View>
  );
};

const CryptoTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <CryptoTabContent {...props} />
  </PerpsSectionProvider>
);

export default CryptoTab;
