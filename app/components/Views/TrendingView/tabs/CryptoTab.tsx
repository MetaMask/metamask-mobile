import React, { useCallback, useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
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
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import { navigateToExplorePredictionsList } from '../feeds/predictions/predictionsNavigation';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import SectionHeader from '../components/SectionHeader';
import TileCarousel from '../components/TileCarousel';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';

interface CryptoPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: (sortOptionId: SortOptionId) => void;
  showDivider?: boolean;
  addSectionTailGap?: boolean;
}

const CryptoPerpsBlock: React.FC<CryptoPerpsBlockProps> = ({
  refresh,
  onViewAll,
  showDivider = false,
  addSectionTailGap = false,
}) => {
  const perps = usePerpsFeed({
    variant: 'crypto',
    refresh,
    withTileExtras: true,
  });

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <Box twClassName={addSectionTailGap ? 'pb-3' : undefined}>
      {showDivider ? <SectionDivider twClassName="-mx-4" /> : null}
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
    </Box>
  );
};

const CryptoTabContent: React.FC<TabProps> = ({
  refresh,
  refreshing,
  onRefresh,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const tokens = useTokensFeed({ refresh });
  const cryptoPredictions = usePredictionsFeed({
    variant: 'crypto',
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
      />
    ),
    [],
  );

  const showTokens = tokens.isLoading || tokens.data.length > 0;
  const showCryptoPerps =
    isPerpsEnabled && (cryptoPerps.isLoading || cryptoPerps.data.length > 0);
  const showPredictions =
    cryptoPredictions.isLoading || cryptoPredictions.data.length > 0;

  const sectionLayout = useMemo(() => {
    const sections: Array<{ key: string; isVerticalList: boolean }> = [];
    if (showTokens) sections.push({ key: 'tokens', isVerticalList: true });
    if (showCryptoPerps) {
      sections.push({ key: 'crypto_perps', isVerticalList: false });
    }
    if (showPredictions) {
      sections.push({ key: 'predictions', isVerticalList: false });
    }

    return (key: string) => {
      const index = sections.findIndex((section) => section.key === key);
      if (index === -1) {
        return { showDivider: false, addSectionTailGap: false };
      }
      const { isVerticalList } = sections[index];
      return {
        showDivider: index > 0,
        addSectionTailGap: index < sections.length - 1 && !isVerticalList,
      };
    };
  }, [showTokens, showCryptoPerps, showPredictions]);

  return (
    <ExploreScroll
      refreshing={refreshing}
      onRefresh={onRefresh}
      testID={TrendingViewSelectorsIDs.EXPLORE_CRYPTO_SCROLL_VIEW}
    >
      {showTokens && (
        <Box>
          {sectionLayout('tokens').showDivider ? (
            <SectionDivider twClassName="-mx-4" />
          ) : null}
          <SectionHeader
            title={strings('trending.trending_tokens')}
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
        </Box>
      )}

      {isPerpsEnabled && (
        <CryptoPerpsBlock
          refresh={refresh}
          onViewAll={(sortOptionId) =>
            navigateToPerpsMarketList(perpsNavigation, 'crypto', sortOptionId)
          }
          {...sectionLayout('crypto_perps')}
        />
      )}

      <PredictionsCarouselSection
        feed={cryptoPredictions}
        tabName="Crypto"
        sectionName="predictions_crypto"
        title={strings('trending.predictions')}
        testIdPrefix="predict-crypto-market-row-item"
        idPrefix="crypto_predictions"
        onViewAll={() => navigateToExplorePredictionsList(navigation, 'crypto')}
        {...sectionLayout('predictions')}
      />
    </ExploreScroll>
  );
};

const CryptoTab: React.FC<TabProps> = (props) => (
  <PerpsSectionProvider>
    <CryptoTabContent {...props} />
  </PerpsSectionProvider>
);

export default CryptoTab;
