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
import { CashSection } from './Sections/Cash';
import TokensSection from './Sections/Tokens';
import WhatsHappeningSection from './Sections/WhatsHappening';
import { PerpsSection as PerpsSectionBase } from './Sections/Perpetuals/PerpsSection';
import PredictionsSection from './Sections/Predictions';
import TopTradersSection from './Sections/TopTraders';
import DeFiSection from './Sections/DeFi';
import NFTsSection from './Sections/NFTs';
import { SectionRefreshHandle } from './types';
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { selectAssetsDefiPositionsEnabled } from '../../../selectors/featureFlagController/assetsDefiPositions';
import { selectWhatsHappeningEnabled } from '../../../selectors/featureFlagController/whatsHappening';
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import { selectIsMusdConversionFlowEnabledFlag } from '../../UI/Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../UI/Earn/hooks/useMusdConversionEligibility';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';
import useHomeSessionSummary from './hooks/useHomeSessionSummary';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useABTest } from '../../../hooks';
import {
  HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
  HOMEPAGE_TRENDING_SECTIONS_VARIANTS,
} from './abTestConfig';
import { useOwnedNfts } from './Sections/NFTs/hooks';
import { strings } from '../../../../locales/i18n';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import { HomepageTrendingAbTestContext } from './context/HomepageTrendingAbTestContext';

/**
 * Homepage component - Main view for the redesigned wallet homepage.
 *
 * This component orchestrates all homepage sections and coordinates
 * their refresh functionality via refs.
 */
const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const cashSectionRef = useRef<SectionRefreshHandle>(null);
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const whatsHappeningSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const topTradersSectionRef = useRef<SectionRefreshHandle>(null);
  const defiSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);
  const trendingTokensRef = useRef<SectionRefreshHandle>(null);
  const trendingPerpsRef = useRef<SectionRefreshHandle>(null);
  const trendingPredictionsRef = useRef<SectionRefreshHandle>(null);

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isDeFiEnabled = useSelector(selectAssetsDefiPositionsEnabled);
  const isWhatsHappeningEnabled = useSelector(selectWhatsHappeningEnabled);
  const isTopTradersEnabled = useSelector(selectSocialLeaderboardEnabled);
  const isMusdConversionEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  const isCashSectionEnabled = isMusdConversionEnabled && isGeoEligible;

  const {
    variant: abVariant,
    isActive: isAbActive,
    variantName: abVariantName,
  } = useABTest(
    HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
    HOMEPAGE_TRENDING_SECTIONS_VARIANTS,
  );
  const separateTrending = abVariant.separateTrending;

  const trendingAbTestContextValue = useMemo(
    () => ({ isActive: isAbActive, variantName: abVariantName }),
    [isAbActive, abVariantName],
  );

  const ownedNfts = useOwnedNfts();
  const hasNfts = ownedNfts.length > 0;

  const { enableAllPopularNetworks } = useNetworkEnablement();

  // useFocusEffect (not useEffect) so we run every time the user focuses this screen
  // (e.g. switches to Wallet tab or returns from a section). With useEffect we would
  // only run on first mount, so "all popular networks" would not be re-applied when
  // they come back to the homepage.
  useFocusEffect(
    useCallback(() => {
      enableAllPopularNetworks();
    }, [enableAllPopularNetworks]),
  );

  /**
   * Compute the ordered list of enabled sections. Cash is first when enabled;
   * Tokens and NFTs are always present; Perps, Predictions, and DeFi are feature-flagged.
   * When separateTrending is active, trending sections are appended.
   */
  const enabledSections = useMemo(() => {
    if (separateTrending) {
      // Treatment: position sections + trending sections + conditional NFT placement
      const sections: { name: HomeSectionName; enabled: boolean }[] = [
        { name: HomeSectionNames.CASH, enabled: isCashSectionEnabled },
        { name: HomeSectionNames.TOKENS, enabled: true },
        {
          name: HomeSectionNames.TOP_TRADERS,
          enabled: isTopTradersEnabled,
        },
        { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
        { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
        { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
      ];

      // NFTs above trending when user has NFTs
      if (hasNfts) {
        sections.push({ name: HomeSectionNames.NFTS, enabled: true });
      }

      // Always-on trending sections
      sections.push(
        {
          name: HomeSectionNames.WHATS_HAPPENING,
          enabled: isWhatsHappeningEnabled,
        },
        { name: HomeSectionNames.TRENDING_TOKENS, enabled: true },
        { name: HomeSectionNames.TRENDING_PERPS, enabled: isPerpsEnabled },
        {
          name: HomeSectionNames.TRENDING_PREDICT,
          enabled: isPredictEnabled,
        },
      );

      // NFTs below trending when user has no NFTs
      if (!hasNfts) {
        sections.push({ name: HomeSectionNames.NFTS, enabled: true });
      }

      return sections.filter((s) => s.enabled);
    }

    // Control: original layout
    return [
      { name: HomeSectionNames.CASH, enabled: isCashSectionEnabled },
      { name: HomeSectionNames.TOKENS, enabled: true },
      {
        name: HomeSectionNames.TOP_TRADERS,
        enabled: isTopTradersEnabled,
      },
      { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
      { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
      {
        name: HomeSectionNames.WHATS_HAPPENING,
        enabled: isWhatsHappeningEnabled,
      },
      { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
      { name: HomeSectionNames.NFTS, enabled: true },
    ].filter((s) => s.enabled);
  }, [
    separateTrending,
    isCashSectionEnabled,
    isWhatsHappeningEnabled,
    isPerpsEnabled,
    isPredictEnabled,
    isDeFiEnabled,
    hasNfts,
    isTopTradersEnabled,
  ]);

  const totalSectionsLoaded = enabledSections.length;

  useHomeSessionSummary({ totalSectionsLoaded });

  const getSectionIndex = useCallback(
    (name: HomeSectionName) =>
      enabledSections.findIndex((s) => s.name === name),
    [enabledSections],
  );

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      cashSectionRef.current?.refresh(),
      tokensSectionRef.current?.refresh(),
      whatsHappeningSectionRef.current?.refresh(),
      perpsSectionRef.current?.refresh(),
      predictionsSectionRef.current?.refresh(),
      topTradersSectionRef.current?.refresh(),
      defiSectionRef.current?.refresh(),
      nftsSectionRef.current?.refresh(),
      trendingTokensRef.current?.refresh(),
      trendingPerpsRef.current?.refresh(),
      trendingPredictionsRef.current?.refresh(),
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const sectionMode = separateTrending ? 'positions-only' : 'default';

  if (separateTrending) {
    const renderTreatmentNonPerpsSections = (
      trendingPerpsSection: React.ReactNode,
    ) => (
      <>
        {isPredictEnabled && (
          <PredictionsSection
            ref={predictionsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
            totalSectionsLoaded={totalSectionsLoaded}
            mode={sectionMode}
          />
        )}
        {isDeFiEnabled && (
          <DeFiSection
            ref={defiSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.DEFI)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}

        {/* NFTs above trending when user has NFTs */}
        {hasNfts && (
          <NFTsSection
            ref={nftsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}

        {/* Always-on trending sections */}
        <WhatsHappeningSection
          ref={whatsHappeningSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.WHATS_HAPPENING)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
        <TokensSection
          ref={trendingTokensRef}
          sectionIndex={getSectionIndex(HomeSectionNames.TRENDING_TOKENS)}
          totalSectionsLoaded={totalSectionsLoaded}
          mode="trending-only"
          sectionName={HomeSectionNames.TRENDING_TOKENS}
          titleOverride={strings('homepage.sections.trending_tokens')}
        />
        {trendingPerpsSection}
        {isPredictEnabled && (
          <PredictionsSection
            ref={trendingPredictionsRef}
            sectionIndex={getSectionIndex(HomeSectionNames.TRENDING_PREDICT)}
            totalSectionsLoaded={totalSectionsLoaded}
            mode="trending-only"
            sectionName={HomeSectionNames.TRENDING_PREDICT}
            titleOverride={strings('homepage.sections.trending_predictions')}
          />
        )}

        {/* NFTs below trending when user has no NFTs */}
        {!hasNfts && (
          <NFTsSection
            ref={nftsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
      </>
    );

    const trendingPerpsSection = (
      <PerpsSectionBase
        ref={trendingPerpsRef}
        sectionIndex={getSectionIndex(HomeSectionNames.TRENDING_PERPS)}
        totalSectionsLoaded={totalSectionsLoaded}
        mode="trending-only"
        sectionName={HomeSectionNames.TRENDING_PERPS}
        titleOverride={strings('homepage.sections.trending_perpetuals')}
      />
    );

    return (
      <HomepageTrendingAbTestContext.Provider
        value={trendingAbTestContextValue}
      >
        <Box
          gap={8}
          marginBottom={8}
          paddingTop={6}
          testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
        >
          {/* Cash — always first */}
          <CashSection
            ref={cashSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.CASH)}
            totalSectionsLoaded={totalSectionsLoaded}
          />

          {/* Position sections — hidden when empty */}
          <TokensSection
            ref={tokensSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
            totalSectionsLoaded={totalSectionsLoaded}
            mode={sectionMode}
          />
          {isTopTradersEnabled && (
            <TopTradersSection
              ref={topTradersSectionRef}
              sectionIndex={getSectionIndex(HomeSectionNames.TOP_TRADERS)}
              totalSectionsLoaded={totalSectionsLoaded}
            />
          )}
          {isPerpsEnabled && (
            <PerpsConnectionProvider suppressErrorView>
              <PerpsStreamProvider>
                <PerpsSectionBase
                  ref={perpsSectionRef}
                  sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
                  totalSectionsLoaded={totalSectionsLoaded}
                  mode={sectionMode}
                />
                <Box gap={8}>
                  {renderTreatmentNonPerpsSections(trendingPerpsSection)}
                </Box>
              </PerpsStreamProvider>
            </PerpsConnectionProvider>
          )}
          {!isPerpsEnabled && renderTreatmentNonPerpsSections(null)}
        </Box>
      </HomepageTrendingAbTestContext.Provider>
    );
  }

  return (
    <HomepageTrendingAbTestContext.Provider value={trendingAbTestContextValue}>
      <Box
        gap={8}
        marginBottom={8}
        paddingTop={6}
        testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
      >
        <CashSection
          ref={cashSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.CASH)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
        <TokensSection
          ref={tokensSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
          totalSectionsLoaded={totalSectionsLoaded}
          mode={sectionMode}
        />
        {isTopTradersEnabled && (
          <TopTradersSection
            ref={topTradersSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.TOP_TRADERS)}
            totalSectionsLoaded={totalSectionsLoaded}
          />
        )}
        {isPerpsEnabled && (
          <PerpsConnectionProvider suppressErrorView>
            <PerpsStreamProvider>
              <PerpsSectionBase
                ref={perpsSectionRef}
                sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
                totalSectionsLoaded={totalSectionsLoaded}
                mode={sectionMode}
              />
            </PerpsStreamProvider>
          </PerpsConnectionProvider>
        )}
        {/* Mount only when enabled so predict homepage hooks are not invoked off-flag
            (PredictionsSection returns null after hooks; see usePredictMarketsForHomepage). */}
        {isPredictEnabled && (
          <PredictionsSection
            ref={predictionsSectionRef}
            sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
            totalSectionsLoaded={totalSectionsLoaded}
            mode={sectionMode}
          />
        )}
        <WhatsHappeningSection
          ref={whatsHappeningSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.WHATS_HAPPENING)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
        <DeFiSection
          ref={defiSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.DEFI)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
        <NFTsSection
          ref={nftsSectionRef}
          sectionIndex={getSectionIndex(HomeSectionNames.NFTS)}
          totalSectionsLoaded={totalSectionsLoaded}
        />
      </Box>
    </HomepageTrendingAbTestContext.Provider>
  );
});

export default Homepage;
