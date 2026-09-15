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
import { useIsActivePerpsTrader } from '../../UI/Perps/hooks';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { selectDeFiPositionsSectionEnabled } from '../../../selectors/deFiPositionsSectionEnabled';
import { selectDeFiPositionsV2SectionEnabled } from '../../../selectors/deFiPositionsV2SectionEnabled';
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import { selectTokenWatchlistEnabled } from '../../UI/Assets/selectors/featureFlags';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';
import useHomeSessionSummary from './hooks/useHomeSessionSummary';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useABTest } from '../../../hooks';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
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
import { selectIsHomepageEarnSectionVisible } from '../../UI/Earn/selectors/visibility';

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
      isHomepageEarnSectionVisible && earnSectionVariant.showEarnSection;

    const { variant: perpsSectionPriorityVariant } = useABTest(
      PERPS_SECTION_PRIORITY_AB_KEY,
      PERPS_SECTION_PRIORITY_VARIANTS,
      PERPS_SECTION_PRIORITY_AB_TEST_EXPOSURE_OPTIONS,
    );
    const isActivePerpsTrader = useIsActivePerpsTrader();
    const showPerpsAboveTokens =
      isPerpsEnabled &&
      perpsSectionPriorityVariant.perpsAboveTokensEligible &&
      isActivePerpsTrader;

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
          // Order must match the JSX below — this drives `sectionIndex` on Home Viewed.
          ...(showPerpsAboveTokens
            ? [
                { name: HomeSectionNames.PERPS, enabled: true },
                { name: HomeSectionNames.TOKENS, enabled: true },
              ]
            : [
                { name: HomeSectionNames.TOKENS, enabled: true },
                { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
              ]),
          { name: HomeSectionNames.EARN, enabled: shouldRenderEarnSection },
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
        showPerpsAboveTokens,
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

    const tokensSection = (
      <TokensSection
        ref={tokensSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
    );
    const perpsSection = isPerpsEnabled ? (
      <HomepagePerpsHomeSlot
        ref={perpsSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
        totalSectionsLoaded={totalSectionsLoaded}
        isActivePerpsTrader={isActivePerpsTrader}
      />
    ) : null;

    return (
      <PerpsConnectionProvider isEnabled={isPerpsEnabled} suppressErrorView>
        <PerpsStreamProvider>
          <Box
            marginBottom={8}
            testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
            accessible={false}
          >
            {balanceBreakdownSectionProps ? (
              <BalanceBreakdownSection {...balanceBreakdownSectionProps} />
            ) : null}
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
            <PredictionsSection
              ref={predictionsSectionRef}
              sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
              totalSectionsLoaded={totalSectionsLoaded}
            />
            {isWatchlistEnabled && (
              <WatchlistSection
                ref={watchlistSectionRef}
                sectionIndex={getSectionIndex(HomeSectionNames.WATCHLIST)}
                totalSectionsLoaded={totalSectionsLoaded}
              />
            )}
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
            <NFTsSection
              ref={nftsSectionRef}
              sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
              totalSectionsLoaded={totalSectionsLoaded}
            />
            <MoreSection />
          </Box>
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    );
  },
);

export default Homepage;
