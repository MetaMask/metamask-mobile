import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { TimeOption } from '../../../Trending/components/TrendingTokensBottomSheet';
import TrendingTokensSkeleton from '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import BridgeTrendingTokensSection from '../BridgeTrendingTokensSection/BridgeTrendingTokensSection';
import CardList from '../../../../Views/TrendingView/components/CardList';
import ExploreSectionList, {
  type ExploreSectionItem,
} from '../../../../Views/TrendingView/components/ExploreSectionList';
import PillScrollList from '../../../../Views/TrendingView/components/PillScrollList';
import SectionHeader from '../../../../Views/TrendingView/components/SectionHeader';
import CryptoMoversPillItem from '../../../../Views/TrendingView/feeds/tokens/CryptoMoversPillItem';
import CryptoMoversSkeleton from '../../../../Views/TrendingView/feeds/tokens/CryptoMoversSkeleton';
import { TokenRowItem } from '../../../../Views/TrendingView/feeds/tokens/TokenRowItem';
import { useTokensFeed } from '../../../../Views/TrendingView/feeds/tokens/useTokensFeed';
import {
  STOCKS_FEED_PREVIEW_PAGE_SIZE,
  useStocksFeed,
} from '../../../../Views/TrendingView/feeds/stocks/useStocksFeed';
import type { ExploreSectionName } from '../../../../Views/TrendingView/search/analytics';
import type { SwapDiscoveryFeedMode } from './abTestConfig';
import {
  trackDiscoveryItemTap,
  trackDiscoverySeeAll,
} from './swapDiscoveryFeedAnalytics';
import { SwapDiscoveryFeedTestIds } from './SwapDiscoveryFeed.testIds';

const HOT_TOKENS_TIME_OPTION = TimeOption.OneHour;
const HOT_TOKENS_ROW_COUNT = 3;
const HOT_TOKENS_MAX_PILLS = 18;

interface FeedSlice {
  data: TrendingAsset[];
  isLoading: boolean;
}

const isFeedVisible = (feed: FeedSlice): boolean =>
  feed.isLoading || feed.data.length > 0;

const createCardItemRenderer =
  ({
    sectionName,
    assetType,
    tokenDetailsSource,
  }: {
    sectionName: ExploreSectionName;
    assetType: 'token' | 'stock';
    tokenDetailsSource: TokenDetailsSource;
  }): ListRenderItem<TrendingAsset> =>
  ({ item, index }) => (
    <TokenRowItem
      token={item}
      index={index}
      tokenDetailsSource={tokenDetailsSource}
      onCardPress={() =>
        trackDiscoveryItemTap({
          sectionName,
          assetType,
          index,
          token: item,
        })
      }
    />
  );

const renderTrendingItem = createCardItemRenderer({
  sectionName: 'tokens_trending',
  assetType: 'token',
  tokenDetailsSource: TokenDetailsSource.TrendingSwaps,
});

const renderStocksItem = createCardItemRenderer({
  sectionName: 'stocks',
  assetType: 'stock',
  tokenDetailsSource: TokenDetailsSource.RwasStocksSwaps,
});

const buildTokenCardSection = ({
  key,
  title,
  sectionName,
  onViewAll,
  feed,
  renderItem,
  idPrefix,
  listTestId,
}: {
  key: string;
  title: string;
  sectionName: ExploreSectionName;
  onViewAll: () => void;
  feed: FeedSlice;
  renderItem: ListRenderItem<TrendingAsset>;
  idPrefix: string;
  listTestId: string;
}): ExploreSectionItem => ({
  key,
  isVerticalList: true,
  content: (
    <>
      <SectionHeader
        title={title}
        onViewAll={() => {
          trackDiscoverySeeAll(sectionName);
          onViewAll();
        }}
      />
      <CardList<TrendingAsset>
        data={feed.data}
        isLoading={feed.isLoading}
        renderItem={renderItem}
        Skeleton={TrendingTokensSkeleton}
        idPrefix={idPrefix}
        listTestId={listTestId}
      />
    </>
  ),
});

const buildHotTokensSection = ({
  navigation,
  feed,
}: {
  navigation: AppNavigationProp;
  feed: FeedSlice;
}): ExploreSectionItem => ({
  key: 'hot_tokens',
  content: (
    <>
      <SectionHeader
        title={strings('trending.hot_tokens')}
        onViewAll={() => {
          trackDiscoverySeeAll('tokens_movers');
          navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
            initialTimeOption: HOT_TOKENS_TIME_OPTION,
          });
        }}
        testID={SwapDiscoveryFeedTestIds.HOT_TOKENS_VIEW_ALL}
      />
      <PillScrollList<TrendingAsset>
        data={feed.data}
        isLoading={feed.isLoading}
        renderItem={(token, index) => (
          <CryptoMoversPillItem
            token={token}
            index={index}
            timeOption={HOT_TOKENS_TIME_OPTION}
            tokenDetailsSource={TokenDetailsSource.MoversSwaps}
            onCardPress={() =>
              trackDiscoveryItemTap({
                sectionName: 'tokens_movers',
                assetType: 'token',
                index,
                token,
              })
            }
          />
        )}
        keyExtractor={(token) => token.assetId ?? ''}
        Skeleton={CryptoMoversSkeleton}
        listTestId={SwapDiscoveryFeedTestIds.HOT_TOKENS_LIST}
        rowCount={HOT_TOKENS_ROW_COUNT}
        maxPills={HOT_TOKENS_MAX_PILLS}
      />
    </>
  ),
});

export interface SwapDiscoveryFeedProps {
  mode: SwapDiscoveryFeedMode;
  isNearBottom?: boolean;
}

const SwapDiscoveryFeedContent: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();

  const hotTokens = useTokensFeed({
    hideRiskyTokens: true,
    timeOption: HOT_TOKENS_TIME_OPTION,
  });
  const trending = useTokensFeed();
  const stocks = useStocksFeed({ pageSize: STOCKS_FEED_PREVIEW_PAGE_SIZE });

  const sections: ExploreSectionItem[] = [];

  if (isFeedVisible(hotTokens)) {
    sections.push(buildHotTokensSection({ navigation, feed: hotTokens }));
  }

  if (isFeedVisible(trending)) {
    sections.push(
      buildTokenCardSection({
        key: 'trending',
        title: strings('trending.trending_tokens'),
        sectionName: 'tokens_trending',
        onViewAll: () =>
          navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW),
        feed: trending,
        renderItem: renderTrendingItem,
        idPrefix: 'swap-tokens',
        listTestId: SwapDiscoveryFeedTestIds.TRENDING_LIST,
      }),
    );
  }

  if (isFeedVisible(stocks)) {
    sections.push(
      buildTokenCardSection({
        key: 'stocks',
        title: strings('trending.stocks'),
        sectionName: 'stocks',
        onViewAll: () =>
          navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW),
        feed: stocks,
        renderItem: renderStocksItem,
        idPrefix: 'swap-stocks',
        listTestId: SwapDiscoveryFeedTestIds.STOCKS_LIST,
      }),
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <Box twClassName="px-4" testID={SwapDiscoveryFeedTestIds.ROOT}>
      <ExploreSectionList sections={sections} />
    </Box>
  );
};

const SwapDiscoveryFeed: React.FC<SwapDiscoveryFeedProps> = ({
  mode,
  isNearBottom,
}) => {
  if (mode === 'empty') {
    return null;
  }

  if (mode === 'control') {
    return <BridgeTrendingTokensSection isNearBottom={isNearBottom} />;
  }

  return <SwapDiscoveryFeedContent />;
};

export default SwapDiscoveryFeed;
