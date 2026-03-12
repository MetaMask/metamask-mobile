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
import PerpsSection from './Sections/Perpetuals';
import PredictionsSection from './Sections/Predictions';
import DeFiSection from './Sections/DeFi';
import NFTsSection from './Sections/NFTs';
import { SectionRefreshHandle } from './types';
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { selectAssetsDefiPositionsEnabled } from '../../../selectors/featureFlagController/assetsDefiPositions';
import { selectIsMusdConversionFlowEnabledFlag } from '../../UI/Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../UI/Earn/hooks/useMusdConversionEligibility';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';
import useHomeSessionSummary from './hooks/useHomeSessionSummary';
import { useNetworkEnablement } from '../../hooks/useNetworkEnablement/useNetworkEnablement';

/**
 * Homepage component - Main view for the redesigned wallet homepage.
 *
 * This component orchestrates all homepage sections and coordinates
 * their refresh functionality via refs.
 */
const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const defiSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isDeFiEnabled = useSelector(selectAssetsDefiPositionsEnabled);
  const isMusdConversionEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  const isCashSectionEnabled = isMusdConversionEnabled && isGeoEligible;

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
   */
  const enabledSections = useMemo(
    () =>
      [
        { name: HomeSectionNames.CASH, enabled: isCashSectionEnabled },
        { name: HomeSectionNames.TOKENS, enabled: true },
        { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
        { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
        { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
        { name: HomeSectionNames.NFTS, enabled: true },
      ].filter((s) => s.enabled),
    [isCashSectionEnabled, isPerpsEnabled, isPredictEnabled, isDeFiEnabled],
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
      predictionsSectionRef.current?.refresh(),
      defiSectionRef.current?.refresh(),
      nftsSectionRef.current?.refresh(),
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <Box
      gap={10}
      marginBottom={8}
      paddingTop={4}
      testID={WalletViewSelectorsIDs.HOMEPAGE_CONTAINER}
    >
      <CashSection
        sectionIndex={getSectionIndex(HomeSectionNames.CASH)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
      <TokensSection
        ref={tokensSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
      <PerpsSection
        ref={perpsSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.PERPS)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
      <PredictionsSection
        ref={predictionsSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.PREDICT)}
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
  );
});

export default Homepage;
