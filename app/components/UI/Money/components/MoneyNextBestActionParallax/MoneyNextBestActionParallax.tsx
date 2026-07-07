import React, { useCallback, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Rive, {
  AutoBind,
  Fit,
  RNRiveError,
  useRive,
  useRiveNumber,
} from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { tiltToParallaxValue } from './parallax';
import NextBestActionParallaxAnimation from '../../../../../animations/next_best_action_module_v1.riv';
import styles from './MoneyNextBestActionParallax.styles';
import { MoneyNextBestActionParallaxTestIds } from './MoneyNextBestActionParallax.testIds';

const log = createProjectLogger('money-parallax');

const RIVE_ARTBOARD_NAME = 'Parallax Block 1';
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
  /** Static image shown when the animation is unavailable or disabled. */
  fallbackImage: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MoneyNextBestActionParallax = ({
  fallbackImage,
  style,
  testID,
}: MoneyNextBestActionParallaxProps) => {
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  const [riveRef, riveInstance] = useRive();
  const [, setXValue] = useRiveNumber(riveInstance, RIVE_PROPERTY_X);
  const [, setYValue] = useRiveNumber(riveInstance, RIVE_PROPERTY_Y);

  const animate = !reduceMotion && !hasRiveError;

  const applyTilt = useCallback(
    (x: number, y: number) => {
      setXValue(tiltToParallaxValue(x));
      setYValue(tiltToParallaxValue(y));
    },
    [setXValue, setYValue],
  );

  useDeviceOrientation(applyTilt, { enabled: animate });

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

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
          ref={riveRef}
          source={NextBestActionParallaxAnimation}
          artboardName={RIVE_ARTBOARD_NAME}
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
        animate ? 'w-full aspect-video overflow-hidden rounded-2xl' : undefined
      }
      testID={testID ?? MoneyNextBestActionParallaxTestIds.CONTAINER}
    >
      {content}
    </Box>
  );
};

export default MoneyNextBestActionParallax;
