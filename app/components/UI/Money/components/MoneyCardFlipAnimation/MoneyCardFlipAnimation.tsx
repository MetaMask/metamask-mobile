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
} from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardFlipAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.2.riv';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import styles from './MoneyCardFlipAnimation.styles';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';

const log = createProjectLogger('money-card-flip');

// -- Rive data-binding names ----------------------------------------------
// These MUST match the names authored in card_tilt_v1.2.riv. If the Rive
// designer renames any of these, update the constants here to keep the
// binding working.

/** Name of the Rive artboard that contains the card flip animation. */
const RIVE_ARTBOARD_NAME = 'MainTilt';

/** Enum data-binding path selecting which card variant is animated. */
const RIVE_CARD_TYPE_PATH = 'cardType';

/** Enum value for the virtual card flip animation. */
const RIVE_CARD_TYPE_VIRTUAL = 'digitalTiltYAnimation';

/** Enum value for the metal card flip animation. */
const RIVE_CARD_TYPE_METAL = 'metalTiltYAnimation';

/** Trigger that fires the entry flip once the card type is set. */
const RIVE_START_TRIGGER = 'startAnimation';

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
  const [riveRef, riveInstance] = useRive();
  const [, setCardType] = useRiveEnum(riveInstance, RIVE_CARD_TYPE_PATH);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  useEffect(() => {
    if (!riveInstance) return;

    setCardType(isMetalCard ? RIVE_CARD_TYPE_METAL : RIVE_CARD_TYPE_VIRTUAL);
    riveInstance.trigger(RIVE_START_TRIGGER);
  }, [riveInstance, setCardType, isMetalCard]);

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
        artboardName={RIVE_ARTBOARD_NAME}
        dataBinding={AutoBind(true)}
        fit={Fit.Contain}
        style={styles.media}
        onError={handleError}
        testID={MoneyCardFlipAnimationTestIds.RIVE}
      />
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
