import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyParallaxAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useRiveParallaxTilt } from '../../hooks/useRiveParallaxTilt';
import { shapeParallaxTilt, smoothParallaxTilt } from '../../utils/parallax';
import NextBestActionParallaxAnimation from '../../../../../animations/next_best_action_module_v1.riv';
import styles from './MoneyNextBestActionParallax.styles';
import { MoneyNextBestActionParallaxTestIds } from './MoneyNextBestActionParallax.testIds';

const log = createProjectLogger('money-parallax');

// Artboard names inside next_best_action_module_v1.riv, one per onboarding step.
export const PARALLAX_ARTBOARD_FUND = 'Parallax Block 1';
export const PARALLAX_ARTBOARD_CARD = 'Parallax Block 2';

// The Rive artboard is transparent — the card's gradient background (sampled
// from the design) is rendered behind it.
const PARALLAX_BACKGROUND_COLORS = [
  'rgb(24, 1, 101)',
  'rgb(40, 43, 142)',
  'rgb(57, 93, 191)',
];

interface MoneyNextBestActionParallaxProps {
  /** Rive artboard to render (see PARALLAX_ARTBOARD_* constants). */
  artboardName: string;
  /** Static image shown when the animation is unavailable or disabled. */
  fallbackImage: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MoneyNextBestActionParallax = ({
  artboardName,
  fallbackImage,
  style,
  testID,
}: MoneyNextBestActionParallaxProps) => {
  const flagEnabled = useSelector(selectMoneyParallaxAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();
  const [erroredArtboard, setErroredArtboard] = useState<string | null>(null);
  const hasRiveError = erroredArtboard === artboardName;
  // Last values shaped for the artboard, in tilt units (0 = at rest). Kept
  // here rather than in state so smoothing costs no re-renders.
  const smoothedTilt = useRef({ x: 0, y: 0 });

  const { riveFile } = useRiveFile(NextBestActionParallaxAnimation);
  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  // The Rive view is remounted per artboard and whenever animation resumes,
  // and a fresh one starts at the artboard's rest pose. Carrying the previous
  // smoothed value across would jump it away from rest on the first sample.
  useEffect(() => {
    smoothedTilt.current = { x: 0, y: 0 };
  }, [artboardName, animate]);

  const shapeTilt = useCallback((x: number, y: number, hz: number) => {
    smoothedTilt.current = {
      x: smoothParallaxTilt(smoothedTilt.current.x, shapeParallaxTilt(x), hz),
      y: smoothParallaxTilt(smoothedTilt.current.y, shapeParallaxTilt(y), hz),
    };
    return smoothedTilt.current;
  }, []);

  const instance = useRiveParallaxTilt(riveFile, {
    artboardName,
    enabled: animate,
    shapeTilt,
  });

  const handleError = useCallback(
    (riveError: RiveError) => {
      log(`Rive error: ${riveError.message}`);
      setErroredArtboard(artboardName);
    },
    [artboardName],
  );

  let content: React.ReactNode;
  if (animate) {
    content = (
      <>
        <LinearGradient
          colors={PARALLAX_BACKGROUND_COLORS}
          style={StyleSheet.absoluteFill}
          testID={MoneyNextBestActionParallaxTestIds.BACKGROUND}
        />
        {riveFile && instance && (
          <RiveView
            // Remount per artboard: swapping `artboardName` in place reloads
            // the artboard but leaves data binding pointing at the previous
            // one.
            key={artboardName}
            file={riveFile}
            artboardName={artboardName}
            dataBind={instance}
            autoPlay
            fit={Fit.Contain}
            style={styles.media}
            onError={handleError}
            testID={MoneyNextBestActionParallaxTestIds.RIVE}
          />
        )}
      </>
    );
  } else {
    content = (
      <Image
        source={fallbackImage}
        style={styles.media}
        resizeMode="contain"
        testID={MoneyNextBestActionParallaxTestIds.STATIC_IMAGE}
      />
    );
  }

  return (
    <Box
      style={style}
      twClassName={
        animate
          ? 'w-full aspect-video overflow-hidden rounded-2xl'
          : 'w-full aspect-video'
      }
      testID={testID ?? MoneyNextBestActionParallaxTestIds.CONTAINER}
    >
      {content}
    </Box>
  );
};

export default MoneyNextBestActionParallax;
