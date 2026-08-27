import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import TokensSection from './Sections/Tokens';
import HomepagePerpsHomeSlot from './Sections/Perpetuals/HomepagePerpsHomeSlot';
import PredictionsSection from './Sections/Predictions';
import TopTradersSection from './Sections/TopTraders';
import DeFiSection from './Sections/DeFi';
import NFTsSection from './Sections/NFTs';
import WatchlistSection from './Sections/Watchlist';
import MoreSection from './Sections/More';
import { SectionRefreshHandle } from './types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { selectDeFiPositionsSectionEnabled } from '../../../selectors/deFiPositionsSectionEnabled';
import { selectDeFiPositionsV2SectionEnabled } from '../../../selectors/deFiPositionsV2SectionEnabled';
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import { selectTokenWatchlistEnabled } from '../../UI/Assets/selectors/featureFlags';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';
import useHomeSessionSummary from './hooks/useHomeSessionSummary';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import BalanceBreakdownSection, {
  type BalanceBreakdownSectionProps,
} from './Sections/BalanceBreakdown';
import EarnSection from './Sections/EarnSection';
import { selectEarnHomeSectionEnabledFlag } from '../../UI/Earn/selectors/featureFlags';

/**
 * TEMP perf-debug switches for the Homepage screen. `PERF_DEBUG.homepage` in
 * Wallet/index.tsx showed that enabling Homepage causes continuous JS-thread activity.
 * Toggle these ONE AT A TIME (rebuild + reprofile) to isolate the section/provider
 * responsible.
 *
 * NOTE: `BalanceBreakdownSection` (via `usePerpsSlice`) and `HomepagePerpsHomeSlot`
 * (via `usePerpsConnection`/`usePerpsStream`) consume the Perps context unconditionally,
 * so they are force-disabled below whenever their required provider is off — otherwise
 * they'd throw "usePerpsConnection/usePerpsStream must be used within a Provider".
 * Remove this block before merging.
 */
const PERF_DEBUG_HOMEPAGE = {
  perpsConnectionProvider: false,
  perpsStreamProvider: false,
  balanceBreakdownSection: false,
  tokensSection: true, //OK
  perpsHomeSlot: false,
  earnSection: true, //OK
  predictionsSection: true, // OK if turning off BTC live price
  watchlistSection: true, //OK
  topTradersSection: true, //OK
  defiSection: true, //OK
  nftsSection: true, //OK
  moreSection: true, //OK
};

/**
 * Homepage component - Main view for the redesigned wallet homepage.
 *
 * This component orchestrates all homepage sections and coordinates
 * their refresh functionality via refs.
 */
export interface HomepageProps {
  balanceBreakdownSectionProps?: BalanceBreakdownSectionProps;
}

const Homepage = forwardRef<SectionRefreshHandle, HomepageProps>(
  ({ balanceBreakdownSectionProps }, ref) => {
    const tokensSectionRef = useRef<SectionRefreshHandle>(null);
    const perpsSectionRef = useRef<SectionRefreshHandle>(null);
    const earnSectionRef = useRef<SectionRefreshHandle>(null);
    const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
    const topTradersSectionRef = useRef<SectionRefreshHandle>(null);
    const defiSectionRef = useRef<SectionRefreshHandle>(null);
    const nftsSectionRef = useRef<SectionRefreshHandle>(null);
    const watchlistSectionRef = useRef<SectionRefreshHandle>(null);

    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const isDeFiV1Enabled = useSelector(selectDeFiPositionsSectionEnabled);
    const isDeFiV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);
    const isDeFiEnabled = isDeFiV1Enabled || isDeFiV2Enabled;
    const isTopTradersEnabled = useSelector(selectSocialLeaderboardEnabled);
    const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
    const isEarnSectionEnabled = useSelector(selectEarnHomeSectionEnabledFlag);

    const { enableAllPopularNetworks, isNetworkEnabled, popularNetworks } =
      useNetworkEnablement();
    const popularNetworksKey = popularNetworks.join(',');
    const areAllPopularNetworksEnabled = useMemo(() => {
      if (popularNetworksKey === '') {
        return true;
      }
      return popularNetworksKey
        .split(',')
        .every((chainId) =>
          isNetworkEnabled(chainId as Parameters<typeof isNetworkEnabled>[0]),
        );
    }, [isNetworkEnabled, popularNetworksKey]);

    // useFocusEffect (not useEffect) so we run every time the user focuses this screen
    // (e.g. switches to Wallet tab or returns from a section). With useEffect we would
    // only run on first mount, so "all popular networks" would not be re-applied when
    // they come back to the homepage.
    useFocusEffect(
      useCallback(() => {
        if (!areAllPopularNetworksEnabled) {
          enableAllPopularNetworks();
        }
      }, [areAllPopularNetworksEnabled, enableAllPopularNetworks]),
    );

    /**
     * Compute the ordered list of enabled sections. Tokens are always present;
     * NFTs, Perps, Predictions, and DeFi are conditional.
     */
    const enabledSections = useMemo(
      () =>
        [
          { name: HomeSectionNames.TOKENS, enabled: true },
          { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
          { name: HomeSectionNames.EARN, enabled: isEarnSectionEnabled },
          { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
          { name: HomeSectionNames.WATCHLIST, enabled: isWatchlistEnabled },
          {
            name: HomeSectionNames.TOP_TRADERS,
            enabled: isTopTradersEnabled,
          },
          { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
          { name: HomeSectionNames.NFTS, enabled: true },
        ].filter((section) => section.enabled),
      [
        isPerpsEnabled,
        isEarnSectionEnabled,
        isPredictEnabled,
        isDeFiEnabled,
        isTopTradersEnabled,
        isWatchlistEnabled,
      ],
    );

    const totalSectionsLoaded = enabledSections.length;

    useHomeSessionSummary({ totalSectionsLoaded });

    const getSectionIndex = useCallback(
      (name: HomeSectionName) =>
        enabledSections.findIndex((s) => s.name === name),
      [enabledSections],
    );

    const refresh = useCallback(async () => {
      await Promise.allSettled([
        tokensSectionRef.current?.refresh(),
        perpsSectionRef.current?.refresh(),
        earnSectionRef.current?.refresh(),
        predictionsSectionRef.current?.refresh(),
        watchlistSectionRef.current?.refresh(),
        topTradersSectionRef.current?.refresh(),
        defiSectionRef.current?.refresh(),
        nftsSectionRef.current?.refresh(),
      ]);
    }, []);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const showBalanceBreakdownSection =
      PERF_DEBUG_HOMEPAGE.balanceBreakdownSection &&
      PERF_DEBUG_HOMEPAGE.perpsConnectionProvider &&
      Boolean(balanceBreakdownSectionProps);

    const showPerpsHomeSlot =
      PERF_DEBUG_HOMEPAGE.perpsHomeSlot &&
      PERF_DEBUG_HOMEPAGE.perpsConnectionProvider &&
      PERF_DEBUG_HOMEPAGE.perpsStreamProvider &&
      isPerpsEnabled;

    const content = (
      <Box
        marginBottom={8}
        testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
        accessible={false}
      >
        {showBalanceBreakdownSection ? (
          <BalanceBreakdownSection {...balanceBreakdownSectionProps} />
        ) : null}
        {PERF_DEBUG_HOMEPAGE.tokensSection && (
          <TokensSection
            ref={tokensSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {showPerpsHomeSlot && (
          <HomepagePerpsHomeSlot
            ref={perpsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.earnSection && isEarnSectionEnabled && (
          <EarnSection
            ref={earnSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.EARN)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.predictionsSection && (
          <PredictionsSection
            ref={predictionsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.watchlistSection && isWatchlistEnabled && (
          <WatchlistSection
            ref={watchlistSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.WATCHLIST)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.topTradersSection && isTopTradersEnabled && (
          <TopTradersSection
            ref={topTradersSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.TOP_TRADERS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.defiSection && isDeFiEnabled && (
          <DeFiSection
            ref={defiSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.DEFI)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.nftsSection && (
          <NFTsSection
            ref={nftsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {PERF_DEBUG_HOMEPAGE.moreSection && <MoreSection />}
      </Box>
    );

    const contentWithStreamProvider =
      PERF_DEBUG_HOMEPAGE.perpsStreamProvider ? (
        <PerpsStreamProvider>{content}</PerpsStreamProvider>
      ) : (
        content
      );

    return PERF_DEBUG_HOMEPAGE.perpsConnectionProvider ? (
      <PerpsConnectionProvider isEnabled={isPerpsEnabled} suppressErrorView>
        {contentWithStreamProvider}
      </PerpsConnectionProvider>
    ) : (
      contentWithStreamProvider
    );
  },
);

export default Homepage;
