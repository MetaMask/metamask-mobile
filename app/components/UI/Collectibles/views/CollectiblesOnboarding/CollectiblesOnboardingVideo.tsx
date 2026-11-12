import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Image as NativeImage,
} from 'react-native';
import { Image } from 'expo-image';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CINEMA_INK } from './CollectiblesOnboarding.constants';

import packVideo from '../../assets/onboarding/onboarding-pack.mp4';
import packPoster from '../../assets/onboarding/onboarding-pack-poster.jpg';
import cardsVideo from '../../assets/onboarding/onboarding-cards.mp4';
import cardsPoster from '../../assets/onboarding/onboarding-cards-poster.jpg';

const FOOTAGE = [
  {
    video: packVideo,
    poster: packPoster,
  },
  {
    video: cardsVideo,
    poster: cardsPoster,
  },
] as const;

/** Original Replit footage is bundled locally; route/background/motion preferences pause it. */
export default function CollectiblesOnboardingVideo({
  step,
  isActive,
}: {
  step: 0 | 1;
  isActive: boolean;
}) {
  const tw = useTailwind();
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [reduced, setReduced] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    const app = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  const paused = !isActive || !foreground || reduced;
  return (
    <Box
      twClassName="absolute inset-x-0 top-0 h-4/5 overflow-hidden"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="collectibles-onboarding-footage"
    >
      <Image
        source={FOOTAGE[step].poster}
        contentFit="cover"
        style={tw.style('absolute inset-0')}
        testID="collectibles-onboarding-poster"
      />
      {!failed && !reduced && (
        <Video
          source={{
            uri: NativeImage.resolveAssetSource(FOOTAGE[step].video)?.uri,
          }}
          paused={paused}
          muted
          repeat
          resizeMode="cover"
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="obey"
          onError={() => setFailed(true)}
          style={tw.style('absolute inset-0')}
          testID="collectibles-onboarding-video"
        />
      )}
      <LinearGradient
        colors={[
          `${CINEMA_INK}00`,
          `${CINEMA_INK}0d`,
          `${CINEMA_INK}59`,
          `${CINEMA_INK}cc`,
          CINEMA_INK,
        ]}
        locations={[0.52, 0.64, 0.76, 0.88, 1]}
        style={tw.style('absolute inset-0')}
      />
    </Box>
  );
}
