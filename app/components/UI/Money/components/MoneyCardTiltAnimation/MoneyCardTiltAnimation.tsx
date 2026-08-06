import React, { useCallback, useRef, useState } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import Rive, { AutoBind, Fit, RNRiveError, RiveRef } from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardTiltAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import {
  pitchToParallaxValue,
  tiltToParallaxValue,
} from '../../utils/parallax';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.5.riv';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import styles from './MoneyCardTiltAnimation.styles';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';

const log = createProjectLogger('money-card-tilt');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in card_tilt_v1.5.riv. If the Rive
// designer renames any of these, update the constants here.
//
// The per-variant artboards are rendered directly so the component needs no
// imperative setup calls that could race the native view's file load. Each
// board tilts on both axes, driven by `xValue` and `yValue`.

/** Artboard holding the virtual-card tilt. */
const RIVE_ARTBOARD_DIGITAL = 'CardTiltDigital';

/** Artboard holding the metal-card tilt. */
const RIVE_ARTBOARD_METAL = 'CardTiltMetal';

/** ViewModel numbers (0-100, rest 50) driving the tilt per axis. */
const RIVE_PROPERTY_X = 'xValue';
const RIVE_PROPERTY_Y = 'yValue';

interface MoneyCardTiltAnimationProps {
  /** Which card variant to show. */
  isMetalCard: boolean;
  testID?: string;
}

const MoneyCardTiltAnimation = ({
  isMetalCard,
  testID,
}: MoneyCardTiltAnimationProps) => {
  const flagEnabled = useSelector(selectMoneyCardTiltAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  // Written to via a plain ref rather than `useRiveNumber`: that hook echoes
  // every value back to JS through setState, re-rendering at the accelerometer
  // sample rate for values this component never reads.
  const riveRef = useRef<RiveRef>(null);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const applyTilt = useCallback((x: number, y: number) => {
    const rive = riveRef.current;
    // viewTag() is null while the native Rive view is detached; dispatching
    // then throws "found null reactTag".
    if (!rive || rive.viewTag() === null) return;
    rive.setNumber(RIVE_PROPERTY_X, tiltToParallaxValue(x));
    rive.setNumber(RIVE_PROPERTY_Y, pitchToParallaxValue(y));
  }, []);

  useDeviceOrientation(applyTilt, { enabled: animate });

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  const artboardName = isMetalCard
    ? RIVE_ARTBOARD_METAL
    : RIVE_ARTBOARD_DIGITAL;

  let content: React.ReactNode;
  if (animate) {
    content = (
      <Rive
        // Remount per artboard: swapping `artboardName` in place reloads the
        // artboard but leaves data binding pointing at the previous one.
        key={artboardName}
        ref={riveRef}
        source={CardTiltAnimation}
        artboardName={artboardName}
        dataBinding={AutoBind(true)}
        fit={Fit.Contain}
        style={styles.media}
        onError={handleError}
        testID={MoneyCardTiltAnimationTestIds.RIVE}
      />
    );
  } else {
    content = (
      <Image
        source={isMetalCard ? mmCardMetal : mmCardRegular}
        style={styles.staticImage}
        resizeMode="contain"
        testID={MoneyCardTiltAnimationTestIds.STATIC_IMAGE}
      />
    );
  }

  return (
    <Box
      style={styles.container}
      testID={testID ?? MoneyCardTiltAnimationTestIds.CONTAINER}
    >
      {content}
    </Box>
  );
};

export default MoneyCardTiltAnimation;
