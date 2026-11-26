import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import ExploreEarnSection from '../components/ExploreEarnSection';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { getCaipChainIdFromAssetId } from '../../../UI/Trending/components/TrendingTokenRowItem/utils';
import { TokenRowItem } from '../feeds/tokens/TokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
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
import CardList from '../components/CardList';
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
  const navigation = useNavigation<AppNavigationProp>();
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

  const tokens = useTokensFeed({ refresh });
  const cryptoPredictions = usePredictTrendingFeed({
    tab: 'crypto',
    refresh,
  });
  const cryptoPerps = usePerpsFeed({
    variant: 'crypto',
    refresh,
    withTileExtras: true,
  });

  const renderTokenItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreCryptoTrending}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: 'Crypto',
            section_name: 'tokens_trending',
            asset_type: 'token',
            position: index,
            token_symbol: item.symbol,
            chain_id: getCaipChainIdFromAssetId(item.assetId),
            item_clicked: item.assetId,
          })
        }
        onQuickTrade={
          quickBuyVariant.showQuickTradeButton
            ? (token) => openQuickBuy(token, 'explore_crypto')
            : undefined
        }
      />
    ),
    [openQuickBuy, quickBuyVariant.showQuickTradeButton],
  );

  const showTokens = tokens.isLoading || tokens.data.length > 0;
  const showCryptoPerps =
    isPerpsEnabled && (cryptoPerps.isLoading || cryptoPerps.data.length > 0);
  const showPredictions =
    cryptoPredictions.isLoading || cryptoPredictions.data.length > 0;

  const sections = useMemo((): ExploreSectionItem[] => {
    const items: ExploreSectionItem[] = [];

    if (showTokens) {
      items.push({
        key: 'tokens',
        isVerticalList: true,
        content: (
          <>
            <SectionHeader
              title={strings('trending.trending_tokens')}
              contentTopInset={2}
              onViewAll={() =>
                navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW)
              }
              testID="section-header-view-all-tokens"
              tabName="Crypto"
              sectionName="tokens_trending"
            />
            <CardList<TrendingAsset>
              data={tokens.data}
              isLoading={tokens.isLoading}
              renderItem={renderTokenItem}
              Skeleton={TrendingTokensSkeleton}
              idPrefix="tokens"
            />
          </>
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
    showTokens,
    showCryptoPerps,
    isEarnSectionVisible,
    showPredictions,
    navigation,
    tokens.data,
    tokens.isLoading,
    renderTokenItem,
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
