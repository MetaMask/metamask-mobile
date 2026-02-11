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
import OnboardingMiniBar from '../../../features/OnboardingChecklist/components/OnboardingMiniBar';
import OnboardingJourneyScreen from '../../../features/OnboardingChecklist/components/OnboardingJourneyScreen';
import FakeSRPScreen from '../../../features/OnboardingChecklist/components/FakeSRPScreen';
import { useOnboardingChecklist, UI_MODE, DESIGN_STYLE } from '../../../features/OnboardingChecklist/hooks/useOnboardingChecklist';
import { Modal, TouchableOpacity, Animated } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

interface HomepageProps {
  onScroll?: (event: any) => void;
}

const Homepage = forwardRef<any, HomepageProps>(({ onScroll }, ref) => {
  const tokensSectionRef = useRef<SectionRefreshHandle>(null);
  const nftsSectionRef = useRef<SectionRefreshHandle>(null);
  const perpsSectionRef = useRef<SectionRefreshHandle>(null);
  const predictionsSectionRef = useRef<SectionRefreshHandle>(null);
  const discoverSectionRef = useRef<SectionRefreshHandle>(null);

  const { uiMode, shouldShow, completeStep, isAllCompleted, reset, designStyle } = useOnboardingChecklist();
  const [showFakeSRP, setShowFakeSRP] = React.useState(false);
  const [showJourney, setShowJourney] = React.useState(false);

  // Scroll animation state
  const barAnim = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleScroll = useCallback((event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;
    
    if (diff > 10 && currentY > 50) {
      // Scrolling down - Hide
      Animated.timing(barAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else if (diff < -10 || currentY < 20) {
      // Scrolling up - Show
      Animated.timing(barAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
    lastScrollY.current = currentY;
  }, [barAnim]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      tokensSectionRef.current?.refresh(),
      nftsSectionRef.current?.refresh(),
      perpsSectionRef.current?.refresh(),
      predictionsSectionRef.current?.refresh(),
      discoverSectionRef.current?.refresh(),
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ refresh, handleScroll }), [refresh, handleScroll]);

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
            zIndex: 2000,
          }}
        >
          <FakeSRPScreen
            onComplete={() => setShowFakeSRP(false)}
            onStepComplete={() => completeStep('step1')}
          />
        </Box>
      )}

      {showJourney && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1500,
          }}
        >
          <OnboardingJourneyScreen
            onClose={() => setShowJourney(false)}
            onSecureWallet={() => {
              setShowJourney(false);
              setShowFakeSRP(true);
            }}
          />
        </Box>
      )}

      <Box gap={6} marginBottom={8}>
        {shouldShow && designStyle !== DESIGN_STYLE.MINI_BAR && uiMode === UI_MODE.BANNER && (
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
      {shouldShow && designStyle !== DESIGN_STYLE.MINI_BAR && uiMode === UI_MODE.FLOATING && (
        <OnboardingFloating onSecureWallet={() => setShowFakeSRP(true)} />
      )}
      {shouldShow && designStyle === DESIGN_STYLE.MINI_BAR && (
        <OnboardingMiniBar
          onPress={() => setShowJourney(true)}
          scrollAnim={barAnim}
        />
      )}
    </>
  );
});

export default Homepage;
