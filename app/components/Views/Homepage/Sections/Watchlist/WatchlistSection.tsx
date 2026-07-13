import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import SectionRow from '../../components/SectionRow';
import TrendingTokenRowItem from '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import WatchlistEmptyState from './components/WatchlistEmptyState';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import { useTokenWatchlistQuery } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery';
import { mapWatchlistTokenToTrendingAsset } from './utils/mapWatchlistTokenToTrendingAsset';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import type { SectionRefreshHandle } from '../../types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const MAX_ITEMS_DISPLAYED = 3;

interface WatchlistSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const WatchlistSection = forwardRef<
  SectionRefreshHandle,
  WatchlistSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const { data, isLoading, refetch } = useTokenWatchlistQuery();

  const title = strings('homepage.sections.watchlist');

  const displayTokens = useMemo(
    () =>
      (data ?? [])
        .slice(0, MAX_ITEMS_DISPLAYED)
        .map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const isEmpty = !isLoading && displayTokens.length === 0;
  const itemCount = displayTokens.length;

  // TODO(ASSETS-XXXX): navigate to full-screen watchlist view in next ticket
  const handleSectionPress = useCallback(() => undefined, []);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: isWatchlistEnabled ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.WATCHLIST,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty,
    itemCount,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.WATCHLIST,
    contentReady: !isLoading,
    isEmpty,
    isLoading,
    enabled: isWatchlistEnabled,
  });

  if (!isWatchlistEnabled) {
    return null;
  }

  return (
    <View ref={sectionViewRef} onLayout={onLayout}>
      <SectionDivider />
      <SectionHeader
        title={title}
        isInteractive
        onPress={handleSectionPress}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')}
      />
      <SectionRow>
        {isLoading ? (
          Array.from({ length: MAX_ITEMS_DISPLAYED }, (_, i) => (
            <TrendingTokensSkeleton key={`watchlist-skeleton-${i}`} />
          ))
        ) : isEmpty ? (
          <WatchlistEmptyState />
        ) : (
          displayTokens.map((token, index) => (
            <TrendingTokenRowItem
              key={token.assetId}
              token={token}
              position={index}
              tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
            />
          ))
        )}
      </SectionRow>
    </View>
  );
});

export default WatchlistSection;
