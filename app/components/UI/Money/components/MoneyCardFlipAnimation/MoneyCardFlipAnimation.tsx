import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import Rive, { Fit, RNRiveError } from 'rive-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardFlipAnimationEnabledFlag } from '../../selectors/featureFlags';
import {
  MONEY_SHEET_ENTRANCE_DURATION_MS,
  MONEY_SHEET_ENTRANCE_TRANSLATE_Y,
} from '../../constants/sheetEntrance';
import { useReduceMotionState } from '../../hooks/useReduceMotion';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.3.riv';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import styles from './MoneyCardFlipAnimation.styles';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';

const log = createProjectLogger('money-card-flip');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in card_tilt_v1.3.riv. If the Rive
// designer renames any of these, update the constants here.
//
// The flip is played as a raw timeline on the per-variant artboards. The
// MainTilt state machine + ViewModel (cardType / startAnimation) do respond
// to data binding in this asset version, but the state machine is still
// deliberately bypassed here so the flip plays as a one-shot timeline.

/** Artboard holding the virtual-card flip animation. */
const RIVE_ARTBOARD_VIRTUAL = 'Card Tilt Y Animation - Digital';

/** Artboard holding the metal-card flip animation. */
const RIVE_ARTBOARD_METAL = 'Card Tilt Y Animation - Metal';

/** One-shot flip timeline present on both variant artboards. */
const RIVE_FLIP_ANIMATION = 'yAnimation';

// Step 0 of the sheet's entrance wave; the remaining steps are staggered off
// the same cadence in `constants/sheetEntrance`.
const ENTRANCE_DURATION_MS = MONEY_SHEET_ENTRANCE_DURATION_MS;
const ENTRANCE_TRANSLATE_Y = MONEY_SHEET_ENTRANCE_TRANSLATE_Y;
const ENTRANCE_INITIAL_OPACITY = 0;

interface MoneyCardFlipAnimationProps {
  /**
   * Which card variant to show. `undefined` means the variant is not known
   * yet (card data still loading): space is reserved but nothing renders, so
   * the one-shot flip plays only once, with the correct variant.
   */
  isMetalCard?: boolean;
  /**
   * Holds the flip back until the surface presenting it has settled. A sheet
   * that mounts this while it is still opening would otherwise run both
   * motions at once, and they compete. Space is reserved while held, so
   * starting the flip shifts nothing.
   */
  shouldPlay?: boolean;
  testID?: string;
}

const MoneyCardFlipAnimation = ({
  isMetalCard,
  shouldPlay = true,
  testID,
}: MoneyCardFlipAnimationProps) => {
  const flagEnabled = useSelector(selectMoneyCardFlipAnimationEnabledFlag);
  const reduceMotionState = useReduceMotionState();
  const [hasRiveError, setHasRiveError] = useState(false);

  const reduceMotion = reduceMotionState ?? true;
  const animate = flagEnabled && !reduceMotion && !hasRiveError;
  const variantKnown = isMetalCard !== undefined;
  // Hold rendering while reduce-motion is unresolved so the first paint never
  // flashes the static image before swapping to the Rive flip.
  const reduceMotionPending =
    flagEnabled && !hasRiveError && reduceMotionState === null;
  // Nothing to sequence when the static image is what renders, so the hold
  // only applies while animating.
  const isHeld = animate && !shouldPlay;

  const entranceOpacity = useSharedValue(ENTRANCE_INITIAL_OPACITY);
  const entranceTranslateY = useSharedValue(ENTRANCE_TRANSLATE_Y);
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceTranslateY.value }],
  }));

  useEffect(() => {
    if (!animate || !variantKnown || isHeld) return;
    entranceOpacity.value = withTiming(1, { duration: ENTRANCE_DURATION_MS });
    entranceTranslateY.value = withTiming(0, {
      duration: ENTRANCE_DURATION_MS,
    });
  }, [animate, variantKnown, isHeld, entranceOpacity, entranceTranslateY]);

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  let content: React.ReactNode;
  if (!variantKnown || reduceMotionPending || isHeld) {
    content = animate ? null : <Box style={styles.placeholder} />;
  } else if (animate) {
    content = (
      <Animated.View style={[styles.media, entranceStyle]}>
        <Rive
          source={CardTiltAnimation}
          artboardName={
            isMetalCard ? RIVE_ARTBOARD_METAL : RIVE_ARTBOARD_VIRTUAL
          }
          animationName={RIVE_FLIP_ANIMATION}
          fit={Fit.Contain}
          style={styles.media}
          onError={handleError}
          testID={MoneyCardFlipAnimationTestIds.RIVE}
        />
      </Animated.View>
    );
  } else {
    content = (
      <Image
        source={isMetalCard ? mmCardMetal : mmCardRegular}
        style={styles.staticImage}
        resizeMode="contain"
        testID={MoneyCardFlipAnimationTestIds.STATIC_IMAGE}
      />
    );
  }

  return (
    <Box
      style={animate ? styles.riveContainer : undefined}
      testID={testID ?? MoneyCardFlipAnimationTestIds.CONTAINER}
    >
      {content}
    </Box>
  );
};

export default MoneyCardFlipAnimation;
