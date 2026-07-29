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
  useViewModelInstance,
  type RiveError,
  type ViewModelNumberProperty,
} from '@rive-app/react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyParallaxAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import {
  pitchToParallaxValue,
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

  const { riveFile } = useRiveFile(NextBestActionParallaxAnimation);
  // The view-model instance is created off the file (async) per artboard and
  // explicitly bound to the view via `dataBind`.
  const { instance } = useViewModelInstance(riveFile, {
    artboardName,
    async: true,
  });

  // Written to via cached property handles rather than `useRiveNumber`: that
  // hook echoes every value back to JS through setState, re-rendering at the
  // accelerometer sample rate for values this component never reads.
  const xPropertyRef = useRef<ViewModelNumberProperty | null>(null);
  const yPropertyRef = useRef<ViewModelNumberProperty | null>(null);

  useEffect(() => {
    if (!instance) return undefined;
    xPropertyRef.current = instance.numberProperty(RIVE_PROPERTY_X) ?? null;
    yPropertyRef.current = instance.numberProperty(RIVE_PROPERTY_Y) ?? null;
    return () => {
      xPropertyRef.current = null;
      yPropertyRef.current = null;
    };
  }, [instance]);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const applyTilt = useCallback((x: number, y: number) => {
    xPropertyRef.current?.set(tiltToParallaxValue(x));
    yPropertyRef.current?.set(pitchToParallaxValue(y));
  }, []);

  useDeviceOrientation(applyTilt, { enabled: animate });

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
