import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import TokensSection from './Sections/Tokens';
import WhatsHappeningSection from './Sections/WhatsHappening';
import PerpsSection from './Sections/Perpetuals';
import PredictionsSection from './Sections/Predictions';
import DeFiSection from './Sections/DeFi';
import NFTsSection from './Sections/NFTs';
import { SectionRefreshHandle } from './types';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { selectAssetsDefiPositionsEnabled } from '../../../selectors/featureFlagController/assetsDefiPositions';
import { HomeSectionNames, HomeSectionName } from './hooks/useHomeViewedEvent';

/**
 * Homepage component - Main view for the redesigned wallet homepage.
 *
 * This component orchestrates all homepage sections and coordinates
 * their refresh functionality via refs.
 */
const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const whatsHappeningSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const defiSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);

  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isDeFiEnabled = useSelector(selectAssetsDefiPositionsEnabled);

  /**
   * Compute the ordered list of enabled sections. Tokens and NFTs are always
   * present; Perps, Predictions, and DeFi are feature-flagged.
   */
  const enabledSections = useMemo(
    () =>
      [
        { name: HomeSectionNames.TOKENS, enabled: true },
        { name: HomeSectionNames.PERPS, enabled: isPerpsEnabled },
        { name: HomeSectionNames.PREDICT, enabled: isPredictEnabled },
        { name: HomeSectionNames.DEFI, enabled: isDeFiEnabled },
        { name: HomeSectionNames.NFTS, enabled: true },
      ].filter((s) => s.enabled),
    [isPerpsEnabled, isPredictEnabled, isDeFiEnabled],
  );

  const totalSectionsLoaded = enabledSections.length;

  const getSectionIndex = useCallback(
    (name: HomeSectionName) =>
      enabledSections.findIndex((s) => s.name === name),
    [enabledSections],
  );

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      tokensSectionRef.current?.refresh(),
      whatsHappeningSectionRef.current?.refresh(),
      perpsSectionRef.current?.refresh(),
      predictionsSectionRef.current?.refresh(),
      defiSectionRef.current?.refresh(),
      nftsSectionRef.current?.refresh(),
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <Box gap={6} marginBottom={8} testID="homepage-container">
      <TokensSection
        ref={tokensSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.TOKENS)}
        totalSectionsLoaded={totalSectionsLoaded}
      />
      <WhatsHappeningSection
        ref={whatsHappeningSectionRef}
        sectionIndex={getSectionIndex(HomeSectionNames.WHATS_HAPPENING)}
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
