import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Box } from '@metamask/design-system-react-native';
import TokensSection from './Sections/Tokens';
import PerpsSection from './Sections/Perps';
import PredictionsSection from './Sections/Predictions';
import DeFiSection from './Sections/DeFi';
import NFTsSection from './Sections/NFTs';
import { SectionRefreshHandle } from './types';

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
    <Box gap={6} marginBottom={8} testID="homepage-container">
      <TokensSection ref={tokensSectionRef} />
      <PerpsSection ref={perpsSectionRef} />
      <PredictionsSection ref={predictionsSectionRef} />
      <DeFiSection ref={defiSectionRef} />
      <NFTsSection ref={nftsSectionRef} />
    </Box>
  );
});

export default Homepage;
