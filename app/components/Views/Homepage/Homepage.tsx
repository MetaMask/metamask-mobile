import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Box } from '@metamask/design-system-react-native';
import TokensSection from './Sections/Tokens';
import NFTsSection from './Sections/NFTs';
import PerpsSection from './Sections/Perps';
import PredictionsSection from './Sections/Predictions';
import DiscoverSection from './Sections/Discover';
import { SectionRefreshHandle } from './types';
import OnboardingBanner from '../../../features/OnboardingChecklist/components/OnboardingBanner';
import OnboardingFloating from '../../../features/OnboardingChecklist/components/OnboardingFloating';
import { useOnboardingChecklist, UI_MODE } from '../../../features/OnboardingChecklist/hooks/useOnboardingChecklist';

const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const discoverSectionRef = useRef<SectionRefreshHandle>(null);

  const { uiMode, isDismissed } = useOnboardingChecklist();

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      tokensSectionRef.current?.refresh(),
      nftsSectionRef.current?.refresh(),
      perpsSectionRef.current?.refresh(),
      predictionsSectionRef.current?.refresh(),
      discoverSectionRef.current?.refresh(),
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <>
      <Box gap={6} marginBottom={8}>
        {!isDismissed && uiMode === UI_MODE.BANNER && <OnboardingBanner />}
        <TokensSection ref={tokensSectionRef} />
        <NFTsSection ref={nftsSectionRef} />
        <PerpsSection ref={perpsSectionRef} />
        <PredictionsSection ref={predictionsSectionRef} />
        <DiscoverSection ref={discoverSectionRef} />
      </Box>
      {!isDismissed && uiMode === UI_MODE.FLOATING && <OnboardingFloating />}
    </>
  );
});

export default Homepage;
