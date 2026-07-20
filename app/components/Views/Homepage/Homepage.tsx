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
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import { selectTokenWatchlistEnabled } from '../../UI/Assets/selectors/featureFlags';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';
import useHomeSessionSummary from './hooks/useHomeSessionSummary';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useOwnedNfts } from './Sections/NFTs/hooks';
import { useNftDetection } from '../../hooks/useNftDetection';
import { useThrottledFocusEffect } from '../../hooks/useThrottledFocusEffect';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';

interface HomepageProps {
  /**
   * When true, skips rendering PerpsConnectionProvider + PerpsStreamProvider
   * because a parent (e.g. HomepageDiscoveryTabs) already provides them.
   */
  perpsProvidersHoisted?: boolean;
}

/**
 * Homepage component - Main view for the redesigned wallet homepage.
 *
 * This component orchestrates all homepage sections and coordinates
 * their refresh functionality via refs.
 */
const Homepage = forwardRef<SectionRefreshHandle, HomepageProps>(
  ({ perpsProvidersHoisted = false }, ref) => {
    const tokensSectionRef = useRef<SectionRefreshHandle>(null);
    const perpsSectionRef = useRef<SectionRefreshHandle>(null);
    const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
    const topTradersSectionRef = useRef<SectionRefreshHandle>(null);
    const defiSectionRef = useRef<SectionRefreshHandle>(null);
    const nftsSectionRef = useRef<SectionRefreshHandle>(null);
    const watchlistSectionRef = useRef<SectionRefreshHandle>(null);

    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const isDeFiEnabled = useSelector(selectDeFiPositionsSectionEnabled);
    const isTopTradersEnabled = useSelector(selectSocialLeaderboardEnabled);
    const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);

    const ownedNfts = useOwnedNfts();
    const hasNfts = ownedNfts.length > 0;

    const { enableAllPopularNetworks, isNetworkEnabled, popularNetworks } =
      useNetworkEnablement();
    const { detectNfts, abortDetection } = useNftDetection();
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

    // TODO(ASSETS-3660): Replace with a proper polling mechanism in NftDetectionController.
    useThrottledFocusEffect(
      useCallback(() => {
        detectNfts(true, false).catch(() => {
          // AbortError is expected when detection is cancelled on blur
        });

        return () => {
          abortDetection();
        };
      }, [detectNfts, abortDetection]),
      300_000, // 5 minutes
    );

    /**
     * Compute the ordered list of enabled sections. Tokens are always present;
     * NFTs, Perps, Predictions, and DeFi are conditional.
     */
    const enabledSections = useMemo(
      () =>
        [
          { name: HomeSectionNames.TOKENS, enabled: true },
          { name: HomeSectionNames.WATCHLIST, enabled: isWatchlistEnabled },
          { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
          { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
          {
            name: HomeSectionNames.TOP_TRADERS,
            enabled: isTopTradersEnabled,
          },
          { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
          { name: HomeSectionNames.NFTS, enabled: hasNfts },
        ].filter((section) => section.enabled),
      [
        isPerpsEnabled,
        isPredictEnabled,
        isDeFiEnabled,
        hasNfts,
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
        watchlistSectionRef.current?.refresh(),
        perpsSectionRef.current?.refresh(),
        predictionsSectionRef.current?.refresh(),
        topTradersSectionRef.current?.refresh(),
        defiSectionRef.current?.refresh(),
        nftsSectionRef.current?.refresh(),
      ]);
    }, []);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    return (
      <Box
        marginBottom={8}
        testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
        accessible={false}
      >
        <TokensSection
          ref={tokensSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
        {isWatchlistEnabled && (
          <WatchlistSection
            ref={watchlistSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.WATCHLIST)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {isPerpsEnabled &&
          (perpsProvidersHoisted ? (
            <HomepagePerpsHomeSlot
              ref={perpsSectionRef}
              sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
              totalSectionsLoaded={totalSectionsLoaded}
            />
          ) : (
            <PerpsConnectionProvider suppressErrorView>
              <PerpsStreamProvider>
                <HomepagePerpsHomeSlot
                  ref={perpsSectionRef}
                  sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
                  totalSectionsLoaded={totalSectionsLoaded}
                />
              </PerpsStreamProvider>
            </PerpsConnectionProvider>
          ))}
        <PredictionsSection
          ref={predictionsSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
        {isTopTradersEnabled && (
          <TopTradersSection
            ref={topTradersSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.TOP_TRADERS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {isDeFiEnabled && (
          <DeFiSection
            ref={defiSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.DEFI)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {hasNfts && (
          <NFTsSection
            ref={nftsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        <MoreSection />
      </Box>
    );
  },
);

export default Homepage;
