import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import Rive, {
  AutoBind,
  Fit,
  RNRiveError,
  useRive,
  useRiveNumber,
} from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardTiltAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { tiltToParallaxValue } from '../MoneyNextBestActionParallax/parallax';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.3.riv';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import styles from './MoneyCardTiltAnimation.styles';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';

const log = createProjectLogger('money-card-tilt');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in card_tilt_v1.3.riv. If the Rive
// designer renames any of these, update the constants here.
//
// The per-variant artboards are rendered directly (not through the `MainTilt`
// wrapper with its `cardType` enum) so the component needs no imperative
// setup calls that could race the native view's file load. The artboards
// shipped here are single-axis (X only), but both `xValue` and `yValue` are
// wired so a future both-axes asset works without code changes.

/**
 * Artboard holding the virtual-card X tilt. The trailing space is authored
 * in the file.
 */
const RIVE_ARTBOARD_DIGITAL = 'Card Tilt X - Digital ';

/** Artboard holding the metal-card X tilt. */
const RIVE_ARTBOARD_METAL = 'Card Tilt X - Metal';

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
  const [riveRef, riveInstance] = useRive();
  const [, setXValue] = useRiveNumber(riveInstance, RIVE_PROPERTY_X);
  const [, setYValue] = useRiveNumber(riveInstance, RIVE_PROPERTY_Y);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const applyTilt = useCallback(
    (x: number, y: number) => {
      // viewTag() is null while the native Rive view is detached; dispatching
      // then throws "found null reactTag".
      if (!riveInstance || riveInstance.viewTag() === null) return;
      setXValue(tiltToParallaxValue(x));
      setYValue(tiltToParallaxValue(y));
    },
    [riveInstance, setXValue, setYValue],
  );

  useDeviceOrientation(applyTilt, { enabled: animate });

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  let content: React.ReactNode;
  if (animate) {
    content = (
      <Rive
        ref={riveRef}
        source={CardTiltAnimation}
        artboardName={isMetalCard ? RIVE_ARTBOARD_METAL : RIVE_ARTBOARD_DIGITAL}
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
