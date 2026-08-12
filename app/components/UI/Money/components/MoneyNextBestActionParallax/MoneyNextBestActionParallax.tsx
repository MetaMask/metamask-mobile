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
import Rive, { AutoBind, Fit, RNRiveError, RiveRef } from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyParallaxAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { useRiveTiltWriter } from '../../hooks/useRiveTiltWriter';
import {
  pitchToParallaxValue,
  shapeParallaxTilt,
  smoothParallaxTilt,
  tiltToParallaxValue,
} from '../../utils/parallax';
import NextBestActionParallaxAnimation from '../../../../../animations/next_best_action_module_v1.riv';
import styles from './MoneyNextBestActionParallax.styles';
import { MoneyNextBestActionParallaxTestIds } from './MoneyNextBestActionParallax.testIds';

const log = createProjectLogger('money-parallax');

// Artboard names inside next_best_action_module_v1.riv, one per onboarding step.
export const PARALLAX_ARTBOARD_FUND = 'Parallax Block 1';
export const PARALLAX_ARTBOARD_CARD = 'Parallax Block 2';

const RIVE_PROPERTY_X = 'xValue';
const RIVE_PROPERTY_Y = 'yValue';

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
  // Written to via a plain ref rather than `useRiveNumber`: that hook echoes
  // every value back to JS through setState, re-rendering at the accelerometer
  // sample rate for values this component never reads.
  const riveRef = useRef<RiveRef>(null);
  // Last values written to the artboard, in tilt units (0 = at rest). Kept
  // here rather than in state so smoothing costs no re-renders.
  const smoothedTilt = useRef({ x: 0, y: 0 });

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  // The Rive view is remounted per artboard and whenever animation resumes,
  // and a fresh one starts at the artboard's rest pose. Carrying the previous
  // smoothed value across would jump it away from rest on the first sample.
  useEffect(() => {
    smoothedTilt.current = { x: 0, y: 0 };
  }, [artboardName, animate]);

  const writeTilt = useRiveTiltWriter({
    riveRef,
    xProperty: RIVE_PROPERTY_X,
    yProperty: RIVE_PROPERTY_Y,
    artboardName,
    enabled: animate,
  });

  const applyTilt = useCallback(
    (x: number, y: number, hz: number) => {
      smoothedTilt.current = {
        x: smoothParallaxTilt(smoothedTilt.current.x, shapeParallaxTilt(x), hz),
        y: smoothParallaxTilt(smoothedTilt.current.y, shapeParallaxTilt(y), hz),
      };
      writeTilt(
        tiltToParallaxValue(smoothedTilt.current.x),
        pitchToParallaxValue(smoothedTilt.current.y),
      );
    },
    [writeTilt],
  );

  useDeviceOrientation(applyTilt, { enabled: animate });

  const handleError = useCallback(
    (riveError: RNRiveError) => {
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
        <Rive
          // Remount per artboard: swapping `artboardName` in place reloads the
          // artboard but leaves data binding pointing at the previous one.
          key={artboardName}
          ref={riveRef}
          source={NextBestActionParallaxAnimation}
          artboardName={artboardName}
          dataBinding={AutoBind(true)}
          fit={Fit.Contain}
          style={styles.media}
          onError={handleError}
          testID={MoneyNextBestActionParallaxTestIds.RIVE}
        />
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
