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
import PredictionsPositionsSection from './Sections/PredictionsPositions';
import PredictionsSection from './Sections/Predictions';
import DiscoverSection from './Sections/Discover';
import SectionSeparator from './components/SectionSeparator';
import { SectionRefreshHandle } from './types';

const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsPositionsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const discoverSectionRef = useRef<SectionRefreshHandle>(null);

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      tokensSectionRef.current?.refresh(),
      nftsSectionRef.current?.refresh(),
      perpsSectionRef.current?.refresh(),
      predictionsPositionsSectionRef.current?.refresh(),
      predictionsSectionRef.current?.refresh(),
      discoverSectionRef.current?.refresh(),
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <Box gap={6} marginBottom={8}>
      <TokensSection ref={tokensSectionRef} />
      <NFTsSection ref={nftsSectionRef} />
      <PredictionsPositionsSection ref={predictionsPositionsSectionRef} />
      <SectionSeparator />
      <PerpsSection ref={perpsSectionRef} />
      <PredictionsSection ref={predictionsSectionRef} />
      <DiscoverSection ref={discoverSectionRef} />
    </Box>
  );
});

export default Homepage;
