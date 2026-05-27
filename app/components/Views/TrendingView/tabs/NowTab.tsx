import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
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
import { usePerpsFeed, type PerpsFeedItem } from '../feeds/perps/usePerpsFeed';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
import PerpsPillItem from '../feeds/perps/PerpsPillItem';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import PredictionsCarouselSection from '../feeds/predictions/PredictionsCarouselSection';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import { getCaipChainIdFromAssetId } from '../../../UI/Trending/components/TrendingTokenRowItem/utils';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import PillScrollList from '../components/PillScrollList';
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
  const perps = usePerpsFeed({
    variant: 'all',
    refresh,
    withTileExtras: false,
  });

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
          )
        }
        testID="section-header-view-all-perps"
        tabName="Now"
        sectionName="perps_movers"
      />
      <PillScrollList<PerpsFeedItem>
        data={perps.data}
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

  const predictions = usePredictionsFeed({ refresh });
  const cryptoMovers = useTokensFeed({ refresh, hideRiskyTokens: true });
  const stocks = useStocksFeed({ refresh });

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
    <Box key="whats-happening" twClassName="-mx-4" marginBottom={6}>
      <WhatsHappeningSection
        ref={whatsHappeningRef}
        source={WhatsHappeningSource.Explore}
      />
    </Box>
  ) : null;

  const predictionsSection = (
    <PredictionsCarouselSection
      key="predictions"
      feed={predictions}
      tabName="Now"
      sectionName="predictions_trending"
      title={strings('wallet.predict')}
      testIdPrefix="predict-market-row-item"
      idPrefix="predictions"
      onViewAll={() => navigateToPredictionsList(navigation, 'trending')}
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
      testID={TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW}
    >
      {orderedIntroSections}

      {showCryptoMovers && (
        <Box>
          <SectionHeader
            title={strings('trending.crypto_movers')}
            onViewAll={() =>
              navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW)
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
