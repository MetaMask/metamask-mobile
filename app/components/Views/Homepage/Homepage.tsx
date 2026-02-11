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
import { useOnboardingChecklist, UI_MODE, DESIGN_STYLE } from '../../../features/OnboardingChecklist/hooks/useOnboardingChecklist';
import { TouchableOpacity, Animated } from 'react-native';
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

  const { uiMode, shouldShow, isAllCompleted, reset, designStyle } = useOnboardingChecklist();

  // Scroll animation state
  const barAnim = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isVisibleBar = useRef(true);

  const handleScroll = useCallback((event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;
    
    // If we've moved more than 5px
    if (Math.abs(diff) > 5) {
      if (diff > 0 && currentY > 100) {
        if (isVisibleBar.current) {
          isVisibleBar.current = false;
          Animated.spring(barAnim, {
            toValue: 150,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      } else if (diff < -5 || currentY < 50) {
        if (!isVisibleBar.current) {
          isVisibleBar.current = true;
          Animated.spring(barAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      }
      lastScrollY.current = currentY;
    }
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
      <Box gap={6} marginBottom={8}>
        {shouldShow && designStyle !== DESIGN_STYLE.MINI_BAR && uiMode === UI_MODE.BANNER && (
          <OnboardingBanner />
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
        <OnboardingFloating />
      )}
      {shouldShow && designStyle === DESIGN_STYLE.MINI_BAR && (
        <OnboardingMiniBar
          scrollAnim={barAnim}
        />
      )}
    </>
  );
});

export default Homepage;
