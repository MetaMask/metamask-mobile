import React, { useCallback, useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Rive, { Fit, RNRiveError } from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import CardEducationAnimation from '../../../../../animations/onboarding_card_education_v2.riv';
import StackedCardsImage from '../../../../../images/stacked-cards.png';
import { CardWelcomeSelectors } from './CardWelcome.testIds';

const log = createProjectLogger('card-education-animation');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in onboarding_card_education_v2.riv.
// If the Rive designer renames any of these, update the constants here.
//
// The cards entrance is played as a raw timeline: the asset ships no
// state-machine inputs, so the state machine is deliberately bypassed here.

/** Artboard holding the stacked-cards entrance animation. */
const RIVE_ARTBOARD_CARDS = 'cards';

/** One-shot cards entrance timeline. */
const RIVE_CARDS_IN_ANIMATION = 'CardsIn';

/** Duration of the CardsIn timeline: 47 frames @ 60fps. */
export const CARDS_IN_DURATION_MS = 783;

interface CardWelcomeCardsAnimationProps {
  animate: boolean;
  style: StyleProp<ImageStyle>;
  testID?: string;
}

const CardWelcomeCardsAnimation = ({
  animate,
  style,
  testID,
}: CardWelcomeCardsAnimationProps) => {
  const [hasRiveError, setHasRiveError] = useState(false);

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  if (animate && !hasRiveError) {
    const riveStyle: ViewStyle = StyleSheet.flatten(style);
    return (
      <Rive
        source={CardEducationAnimation}
        artboardName={RIVE_ARTBOARD_CARDS}
        animationName={RIVE_CARDS_IN_ANIMATION}
        autoplay
        fit={Fit.Contain}
        style={riveStyle}
        onError={handleError}
        testID={testID ?? CardWelcomeSelectors.CARDS_ANIMATION}
      />
    );
  }

  return (
    <Image
      source={StackedCardsImage}
      style={style}
      resizeMode="contain"
      testID={testID ?? CardWelcomeSelectors.CARD_IMAGE}
    />
  );
};

export default CardWelcomeCardsAnimation;
