import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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
import { SectionRefreshHandle, type HomepageDeviceCapability } from './types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { useIsActivePerpsTrader } from '../../UI/Perps/hooks';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { selectDeFiPositionsSectionEnabled } from '../../../selectors/deFiPositionsSectionEnabled';
import { selectDeFiPositionsV2SectionEnabled } from '../../../selectors/deFiPositionsV2SectionEnabled';
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import { selectTokenWatchlistEnabled } from '../../UI/Assets/selectors/featureFlags';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';
import useHomeSessionSummary from './hooks/useHomeSessionSummary';
import {
  getHomepageSectionMountMode,
  shouldPlacePerpsAboveTokens,
  shouldPlaceTopTradersAboveAllocation,
  shouldShowTopTradersAboveAllocation,
} from './hooks/homepageSectionMountPolicy';
import { useIsSocialTopTradersEligible } from './hooks/useIsSocialTopTradersEligible';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useABTest } from '../../../hooks';
import { useNetworkTierState } from '../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../util/deviceCapability';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsPriorityEligibilityContext } from './context/PerpsPriorityEligibilityContext';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import BalanceBreakdownSection, {
  type BalanceBreakdownSectionProps,
} from './Sections/BalanceBreakdown';
import { HomepageEarnSection } from './Sections/EarnSection';
import {
  HOMEPAGE_EARN_SECTION_AB_KEY,
  HOMEPAGE_EARN_SECTION_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_EARN_SECTION_VARIANTS,
  PERPS_SECTION_PRIORITY_AB_KEY,
  PERPS_SECTION_PRIORITY_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_SECTION_PRIORITY_VARIANTS,
} from './abTestConfig';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_VARIANTS,
} from '../../../constants/socialV1';
import { selectIsHomepageEarnSectionVisible } from '../../UI/Earn/selectors/visibility';
import HomeHeaderToContent from '../shared/homeSectionGap/HomeHeaderToContent';

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
    const [hardwareTier] = useState(() => getHardwareTier());
    const { tier: networkTier, isResolved: networkTierResolved } =
      useNetworkTierState();
    const [isPrimaryTokenContentReady, setIsPrimaryTokenContentReady] =
      useState(false);
    const [hasObservedOfflineNetwork, setHasObservedOfflineNetwork] = useState(
      networkTier === 'NONE',
    );
    const sectionMountMode = getHomepageSectionMountMode({
      hardwareTier,
      networkTier,
    });
    const homepageDeviceCapability: HomepageDeviceCapability = useMemo(
      () => ({ hardwareTier, networkTier, networkTierResolved }),
      [hardwareTier, networkTier, networkTierResolved],
    );
    const [hasMountedOptionalSections, setHasMountedOptionalSections] =
      useState(sectionMountMode === 'immediate' && networkTierResolved);
    useEffect(() => {
      if (networkTier === 'NONE') {
        setHasObservedOfflineNetwork(true);
      }
    }, [networkTier]);
    // Keep the primary token surface in the first commit on constrained
    // devices. This gates optional section mount work without delaying token
    // balance refresh or changing the Homepage Ready boundary.
    const isWaitingForOfflineRecovery =
      hasObservedOfflineNetwork &&
      networkTier !== 'NONE' &&
      !hasMountedOptionalSections;
    const effectiveSectionMountMode = isWaitingForOfflineRecovery
      ? 'when_network_available'
      : sectionMountMode;
    const canMountOptionalSections =
      (effectiveSectionMountMode === 'immediate' && networkTierResolved) ||
      (effectiveSectionMountMode === 'after_primary_content' &&
        networkTierResolved &&
        isPrimaryTokenContentReady) ||
      (effectiveSectionMountMode === 'when_network_available' &&
        networkTier !== 'NONE' &&
        isPrimaryTokenContentReady);
    useEffect(() => {
      if (canMountOptionalSections) {
        setHasMountedOptionalSections(true);
      }
    }, [canMountOptionalSections]);
    const shouldMountOptionalSections =
      hasMountedOptionalSections || canMountOptionalSections;

    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const isDeFiV1Enabled = useSelector(selectDeFiPositionsSectionEnabled);
    const isDeFiV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);
    const isDeFiEnabled = isDeFiV1Enabled || isDeFiV2Enabled;
    const isTopTradersEnabled = useSelector(selectSocialLeaderboardEnabled);
    const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
    const isHomepageEarnSectionVisible = useSelector(
      selectIsHomepageEarnSectionVisible,
    );
    const { variant: earnSectionVariant } = useABTest(
      HOMEPAGE_EARN_SECTION_AB_KEY,
      HOMEPAGE_EARN_SECTION_VARIANTS,
      {
        ...HOMEPAGE_EARN_SECTION_AB_TEST_EXPOSURE_OPTIONS,
        trackExposure: isHomepageEarnSectionVisible,
      },
    );
    const shouldRenderEarnSection =
      shouldMountOptionalSections &&
      isHomepageEarnSectionVisible &&
      earnSectionVariant.showEarnSection;

    const { variant: perpsSectionPriorityVariant } = useABTest(
      PERPS_SECTION_PRIORITY_AB_KEY,
      PERPS_SECTION_PRIORITY_VARIANTS,
      PERPS_SECTION_PRIORITY_AB_TEST_EXPOSURE_OPTIONS,
    );
    const { variant: socialV1Variant } = useABTest(
      SOCIAL_V1_AB_KEY,
      SOCIAL_V1_VARIANTS,
      { trackExposure: false },
    );
    const isActivePerpsTrader = useIsActivePerpsTrader();
    const shouldRenderPerps = isPerpsEnabled && shouldMountOptionalSections;
    // Decide the Perps position from the initial Homepage layout. Deferred
    // sections must not move above Tokens after the primary surface renders.
    const [perpsAboveTokensPlacement] = useState(() =>
      shouldPlacePerpsAboveTokens({
        optionalSectionsCanMount:
          effectiveSectionMountMode === 'immediate' && networkTierResolved,
        isPerpsEnabled,
        perpsAboveTokensEligible:
          perpsSectionPriorityVariant.perpsAboveTokensEligible,
        isActivePerpsTrader,
      }),
    );
    const showPerpsAboveTokens = perpsAboveTokensPlacement && shouldRenderPerps;
    const isSocialV1PriorityEnabled =
      isTopTradersEnabled && socialV1Variant.useSocialV1;
    const shouldHydrateSocialProfile =
      isSocialV1PriorityEnabled &&
      networkTierResolved &&
      networkTier !== 'NONE' &&
      hardwareTier !== 'LOW';
    const isSocialTopTradersEligible = useIsSocialTopTradersEligible(
      isSocialV1PriorityEnabled,
      shouldHydrateSocialProfile,
    );
    const [topTradersAboveAllocationPlacement] = useState(() =>
      shouldPlaceTopTradersAboveAllocation({
        optionalSectionsCanMount:
          effectiveSectionMountMode === 'immediate' && networkTierResolved,
        isSocialV1PriorityEnabled,
        isSocialTopTradersEligible,
      }),
    );
    const showTopTradersAboveAllocation = shouldShowTopTradersAboveAllocation({
      topTradersAboveAllocationPlacement,
      shouldMountOptionalSections,
      isTopTradersEnabled,
      isSocialV1PriorityEnabled,
    });

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
          ...(showTopTradersAboveAllocation
            ? [{ name: HomeSectionNames.TOP_TRADERS, enabled: true }]
            : []),
          // Order must match the JSX below — this drives `sectionIndex` on Home Viewed.
          ...(showPerpsAboveTokens
            ? [
                { name: HomeSectionNames.PERPS, enabled: true },
                { name: HomeSectionNames.TOKENS, enabled: true },
              ]
            : [
                { name: HomeSectionNames.TOKENS, enabled: true },
                { name: HomeSectionNames.PERPS, enabled: shouldRenderPerps },
              ]),
          { name: HomeSectionNames.EARN, enabled: shouldRenderEarnSection },
          {
            name: HomeSectionNames.PREDICT,
            enabled: isPredictEnabled && shouldMountOptionalSections,
          },
          {
            name: HomeSectionNames.WATCHLIST,
            enabled: isWatchlistEnabled && shouldMountOptionalSections,
          },
          {
            name: HomeSectionNames.TOP_TRADERS,
            enabled:
              isTopTradersEnabled &&
              shouldMountOptionalSections &&
              !showTopTradersAboveAllocation,
          },
          {
            name: HomeSectionNames.DEFI,
            enabled: isDeFiEnabled && shouldMountOptionalSections,
          },
          { name: HomeSectionNames.NFTS, enabled: shouldMountOptionalSections },
        ].filter((section) => section.enabled),
      [
        shouldRenderPerps,
        shouldMountOptionalSections,
        showPerpsAboveTokens,
        showTopTradersAboveAllocation,
        shouldRenderEarnSection,
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

    // Keyed so a Perps/Tokens reorder moves the sections instead of
    // remounting them, which would reset in-section state such as token-list
    // scroll and re-fire section_viewed within the same visit.
    const tokensSection = (
      <TokensSection
        key="tokens"
        ref={tokensSectionRef}
        deviceCapability={homepageDeviceCapability}
        onContentReadyChange={setIsPrimaryTokenContentReady}
        sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
    );
    const perpsSection = shouldRenderPerps ? (
      <HomepagePerpsHomeSlot
        key="perps"
        ref={perpsSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
    ) : null;

    return (
      <PerpsPriorityEligibilityContext.Provider value={isActivePerpsTrader}>
        <PerpsConnectionProvider
          isEnabled={isPerpsEnabled && shouldMountOptionalSections}
          suppressErrorView
        >
          <PerpsStreamProvider>
            <Box
              marginBottom={8}
              testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
              accessible={false}
            >
              {balanceBreakdownSectionProps ? (
                <BalanceBreakdownSection
                  {...balanceBreakdownSectionProps}
                  deviceCapability={homepageDeviceCapability}
                />
              ) : null}
              <HomeHeaderToContent>
                {showTopTradersAboveAllocation && (
                  <TopTradersSection
                    key="top-traders"
                    ref={topTradersSectionRef}
                    sectionIndex={getSectionIndex(HomeSectionNames.TOP_TRADERS)}
                    totalSectionsLoaded={totalSectionsLoaded}
                  />
                )}
                {showPerpsAboveTokens ? (
                  <>
                    {perpsSection}
                    {tokensSection}
                  </>
                ) : (
                  <>
                    {tokensSection}
                    {perpsSection}
                  </>
                )}
                {shouldRenderEarnSection && (
                  <HomepageEarnSection
                    ref={earnSectionRef}
                    sectionIndex={getSectionIndex(HomeSectionNames.EARN)}
                    totalSectionsLoaded={totalSectionsLoaded}
                    showDividers
                  />
                )}
                {shouldMountOptionalSections && (
                  <PredictionsSection
                    ref={predictionsSectionRef}
                    sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
                    totalSectionsLoaded={totalSectionsLoaded}
                  />
                )}
                {shouldMountOptionalSections && isWatchlistEnabled && (
                  <WatchlistSection
                    ref={watchlistSectionRef}
                    sectionIndex={getSectionIndex(HomeSectionNames.WATCHLIST)}
                    totalSectionsLoaded={totalSectionsLoaded}
                  />
                )}
                {shouldMountOptionalSections &&
                  isTopTradersEnabled &&
                  !showTopTradersAboveAllocation && (
                    <TopTradersSection
                      key="top-traders"
                      ref={topTradersSectionRef}
                      sectionIndex={getSectionIndex(
                        HomeSectionNames.TOP_TRADERS,
                      )}
                      totalSectionsLoaded={totalSectionsLoaded}
                    />
                  )}
                {shouldMountOptionalSections && isDeFiEnabled && (
                  <DeFiSection
                    ref={defiSectionRef}
                    sectionIndex={getSectionIndex(HomeSectionNames.DEFI)}
                    totalSectionsLoaded={totalSectionsLoaded}
                  />
                )}
                {shouldMountOptionalSections && (
                  <NFTsSection
                    ref={nftsSectionRef}
                    sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
                    totalSectionsLoaded={totalSectionsLoaded}
                  />
                )}
                <MoreSection />
              </HomeHeaderToContent>
            </Box>
          </PerpsStreamProvider>
        </PerpsConnectionProvider>
      </PerpsPriorityEligibilityContext.Provider>
    );
  },
);

export default Homepage;
