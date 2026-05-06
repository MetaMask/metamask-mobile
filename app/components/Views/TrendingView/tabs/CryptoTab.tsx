import React, { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
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
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsTileRowItem from '../feeds/perps/PerpsTileRowItem';
import PerpsMarketTileCardSkeleton from '../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { PredictionCarouselRowItem } from '../feeds/predictions/PredictionRowItem';
import PredictionsSkeleton from '../feeds/predictions/PredictionsSkeleton';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import HorizontalCarousel from '../components/HorizontalCarousel';
import SectionHeader from '../components/SectionHeader';
import TileCarousel from '../components/TileCarousel';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';

interface CryptoPerpsBlockProps {
  refresh: TabProps['refresh'];
  onViewAll: () => void;
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

  if (!perps.isLoading && perps.data.length === 0) return null;

  return (
    <Box>
      <SectionHeader
        title={strings('trending.crypto_perps_section')}
        onViewAll={onViewAll}
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
            onBeforePress={() =>
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
        onViewMore={onViewAll}
        testID="explore-crypto_perps-carousel"
        viewMoreTestID="crypto_perps-view-more-card"
      />
    </Box>
  );
};

const CryptoTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const tokens = useTokensFeed({ refresh });
  const cryptoPredictions = usePredictionsFeed({
    variant: 'crypto',
    refresh,
  });

  const renderTokenItem: ListRenderItem<TrendingAsset> = useCallback(
    ({ item, index }) => (
      <TokenRowItem
        token={item}
        index={index}
        tokenDetailsSource={TokenDetailsSource.ExploreCryptoTrending}
        onBeforePress={() =>
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

  const renderPredictionItem: ListRenderItem<PredictMarketType> = useCallback(
    ({ item, index }) => (
      <PredictionCarouselRowItem
        market={item}
        testIdPrefix="predict-crypto-market-row-item"
        onBeforePress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: 'Crypto',
            section_name: 'predictions_crypto',
            asset_type: 'prediction',
            position: index,
            item_clicked: item.id,
          })
        }
        onVote={(marketId) =>
          trackExploreInteracted({
            interaction_type: 'prediction_voted',
            tab_name: 'Crypto',
            section_name: 'predictions_crypto',
            item_clicked: marketId,
          })
        }
      />
    ),
    [],
  );

  const showTokens = tokens.isLoading || tokens.data.length > 0;
  const showCryptoPredictions =
    cryptoPredictions.isLoading || cryptoPredictions.data.length > 0;

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
      {showTokens && (
        <Box>
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
        <PerpsSectionProvider>
          <CryptoPerpsBlock
            refresh={refresh}
            onViewAll={() =>
              navigateToPerpsMarketList(perpsNavigation, 'crypto')
            }
          />
        </PerpsSectionProvider>
      )}

      {showCryptoPredictions && (
        <Box>
          <SectionHeader
            title={strings('trending.predictions')}
            onViewAll={() => navigateToPredictionsList(navigation, 'crypto')}
            testID="section-header-view-all-crypto_predictions"
            tabName="Crypto"
            sectionName="predictions_crypto"
          />
          <HorizontalCarousel<PredictMarketType>
            data={cryptoPredictions.data}
            isLoading={cryptoPredictions.isLoading}
            renderItem={renderPredictionItem}
            Skeleton={PredictionsSkeleton}
            idPrefix="crypto_predictions"
          />
        </Box>
      )}
    </ExploreScroll>
  );
};

export default CryptoTab;
