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
import { useReduceMotion } from '../../hooks/useReduceMotion';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.2.riv';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import styles from './MoneyCardFlipAnimation.styles';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';

const log = createProjectLogger('money-card-flip');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in card_tilt_v1.2.riv. If the Rive
// designer renames any of these, update the constants here.
//
// The flip is played as a raw timeline on the per-variant artboards. The
// MainTilt state machine + ViewModel (cardType / startAnimation) do not
// respond to the data-bound trigger in this asset version, so the state
// machine is deliberately bypassed here.

/** Artboard holding the virtual-card flip animation. */
const RIVE_ARTBOARD_VIRTUAL = 'Card Tilt Y Animation - Digital';

/** Artboard holding the metal-card flip animation. */
const RIVE_ARTBOARD_METAL = 'Card Tilt Y Animation - Metal';

/** One-shot flip timeline present on both variant artboards. */
const RIVE_FLIP_ANIMATION = 'yAnimation';

const ENTRANCE_DURATION_MS = 250;
const ENTRANCE_TRANSLATE_Y = 10;
const ENTRANCE_INITIAL_OPACITY = 0.5;

interface MoneyCardFlipAnimationProps {
  isMetalCard: boolean;
  testID?: string;
}

const MoneyCardFlipAnimation = ({
  isMetalCard,
  testID,
}: MoneyCardFlipAnimationProps) => {
  const flagEnabled = useSelector(selectMoneyCardFlipAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const entranceOpacity = useSharedValue(ENTRANCE_INITIAL_OPACITY);
  const entranceTranslateY = useSharedValue(ENTRANCE_TRANSLATE_Y);
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceTranslateY.value }],
  }));

  useEffect(() => {
    if (!animate) return;
    entranceOpacity.value = withTiming(1, { duration: ENTRANCE_DURATION_MS });
    entranceTranslateY.value = withTiming(0, {
      duration: ENTRANCE_DURATION_MS,
    });
  }, [animate, entranceOpacity, entranceTranslateY]);

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  let content: React.ReactNode;
  if (animate) {
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
