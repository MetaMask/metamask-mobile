import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import Rive, {
  AutoBind,
  Fit,
  RNRiveError,
  useRive,
  useRiveEnum,
  useRiveNumber,
  useRiveTrigger,
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
// The `cardType` variants shipped here are single-axis (X only), but both
// `xValue` and `yValue` are wired so a future both-axes asset works without
// code changes.

/** Artboard holding the data-bound tilt state machine. */
const RIVE_ARTBOARD_MAIN = 'MainTilt';

/** ViewModel enum selecting the card variant to display. */
const RIVE_PROPERTY_CARD_TYPE = 'cardType';

/** `cardType` value for the virtual card, tilting on the X axis. */
const RIVE_CARD_TYPE_DIGITAL = 'digitalTiltX';

/** `cardType` value for the metal card, tilting on the X axis. */
const RIVE_CARD_TYPE_METAL = 'metalTiltX';

/** ViewModel numbers (0-100, rest 50) driving the tilt per axis. */
const RIVE_PROPERTY_X = 'xValue';
const RIVE_PROPERTY_Y = 'yValue';

/** ViewModel trigger playing the entry reveal animation. */
const RIVE_TRIGGER_START = 'startAnimation';

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
  const [, setCardType] = useRiveEnum(riveInstance, RIVE_PROPERTY_CARD_TYPE);
  const [, setXValue] = useRiveNumber(riveInstance, RIVE_PROPERTY_X);
  const [, setYValue] = useRiveNumber(riveInstance, RIVE_PROPERTY_Y);
  const fireStartAnimation = useRiveTrigger(riveInstance, RIVE_TRIGGER_START);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  useEffect(() => {
    if (!riveInstance || !animate) return;
    setCardType(isMetalCard ? RIVE_CARD_TYPE_METAL : RIVE_CARD_TYPE_DIGITAL);
    fireStartAnimation?.();
  }, [riveInstance, animate, isMetalCard, setCardType, fireStartAnimation]);

  const applyTilt = useCallback(
    (x: number, y: number) => {
      if (!riveInstance) return;
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
        artboardName={RIVE_ARTBOARD_MAIN}
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
