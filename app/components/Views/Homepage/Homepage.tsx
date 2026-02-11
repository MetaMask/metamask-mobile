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
import FakeSRPScreen from '../../../features/OnboardingChecklist/components/FakeSRPScreen';
import { useOnboardingChecklist, UI_MODE } from '../../../features/OnboardingChecklist/hooks/useOnboardingChecklist';
import { Modal, TouchableOpacity } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const discoverSectionRef = useRef<SectionRefreshHandle>(null);

  const { uiMode, shouldShow, completeStep, isAllCompleted, reset } = useOnboardingChecklist();
  const [showFakeSRP, setShowFakeSRP] = React.useState(false);

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
      {showFakeSRP && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <FakeSRPScreen
            onComplete={() => setShowFakeSRP(false)}
            onStepComplete={() => completeStep('step1')}
          />
        </Box>
      )}
      <Box gap={6} marginBottom={8}>
        {shouldShow && uiMode === UI_MODE.BANNER && (
          <OnboardingBanner onSecureWallet={() => setShowFakeSRP(true)} />
        )}
        {!shouldShow && isAllCompleted && (
          <Box twClassName="p-4 mx-4 my-2 rounded-xl bg-background-alternative border border-dashed border-border-muted items-center">
            <TouchableOpacity onPress={reset}>
              <Text variant={TextVariant.BodySM} color={TextColor.Info}>
                Onboarding Complete - Tap to Reset (Demo)
              </Text>
            </TouchableOpacity>
          </Box>
        )}
        <TokensSection ref={tokensSectionRef} />
        <NFTsSection ref={nftsSectionRef} />
        <PerpsSection ref={perpsSectionRef} />
        <PredictionsSection ref={predictionsSectionRef} />
        <DiscoverSection ref={discoverSectionRef} />
      </Box>
      {shouldShow && uiMode === UI_MODE.FLOATING && (
        <OnboardingFloating onSecureWallet={() => setShowFakeSRP(true)} />
      )}
    </>
  );
});

export default Homepage;
