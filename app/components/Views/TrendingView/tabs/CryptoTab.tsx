import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { strings } from '../../../../../locales/i18n';
import ExploreScroll from '../components/ExploreScroll';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TopTradersSection from '../../Homepage/Sections/TopTraders/TopTradersSection';
import type { TabProps } from '../hooks/useExploreRefresh';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import CryptoTokensPillBlock from '../feeds/tokens/CryptoTokensPillBlock';
import {
  getEffectiveActiveCryptoPillKey,
  getSelectableCryptoPills,
  getVisibleCryptoPills,
  useCryptoPillFeed,
} from '../feeds/tokens/useCryptoPillFeed';
import type { CryptoPillKey } from '../feeds/tokens/cryptoPillConfig';
import { selectTokenWatchlistEnabled } from '../../../UI/Assets/selectors/featureFlags';
import { useTrendingQuickBuySheet } from '../../../UI/Trending/contexts';
import { useABTest } from '../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../search/abTestConfig';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import type { TrendingAsset } from '@metamask/assets-controllers';

const styles = StyleSheet.create({
  container: { flex: 1 },
});

const CryptoTabContent: React.FC<TabProps> = ({
  refresh,
  refreshing,
  onRefresh,
}) => {
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

  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const [activeCryptoPillKey, setActiveCryptoPillKey] =
    useState<CryptoPillKey>();
  const [feedActivePillKey, setFeedActivePillKey] = useState<CryptoPillKey>();
  const defaultCryptoPillKey: CryptoPillKey = 'trending';
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

  const topTraders = useMemo(
    () =>
      showTopTraders ? (
        <>
          <Box twClassName="pb-1">
            <TopTradersSection
              source="explore_crypto"
              prefetchProfiles={prefetchTraderProfiles}
            />
          </Box>
          <SectionDivider />
        </>
      ) : null,
    [showTopTraders, prefetchTraderProfiles],
  );

  if (!showTokensSection) {
    return (
      <View style={styles.container}>
        <ExploreScroll
          refreshing={refreshing}
          onRefresh={onRefresh}
          testID={TrendingViewSelectorsIDs.EXPLORE_CRYPTO_SCROLL_VIEW}
        >
          {topTraders}
        </ExploreScroll>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CryptoTokensPillBlock
        title={strings('trending.crypto_tokens_section')}
        activePillKey={activeCryptoPillKey}
        onActivePillChange={setActiveCryptoPillKey}
        onQuickTrade={
          quickBuyVariant.showQuickTradeButton ? tokensOnQuickTrade : undefined
        }
        tabName="Crypto"
        headerTestID="section-header-view-all-tokens"
        idPrefix="tokens"
        testIdPrefix="crypto-tokens"
        listTestId="crypto-tokens-list"
        ListHeaderComponent={topTraders}
        refreshing={refreshing}
        onRefresh={onRefresh}
        testID={TrendingViewSelectorsIDs.EXPLORE_CRYPTO_SCROLL_VIEW}
      />
    </View>
  );
};

const CryptoTab: React.FC<TabProps> = (props) => (
  <CryptoTabContent {...props} />
);

export default CryptoTab;
