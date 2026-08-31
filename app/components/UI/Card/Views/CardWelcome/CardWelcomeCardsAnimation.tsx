import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { createProjectLogger } from '@metamask/utils';
import CardEducationAnimation from '../../../../../animations/onboarding_card_education_v3.riv';
import StackedCardsImage from '../../../../../images/stacked-cards.png';
import { CardWelcomeSelectors } from './CardWelcome.testIds';

const log = createProjectLogger('card-education-animation');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in onboarding_card_education_v3.riv.
// If the Rive designer renames any of these, update the constants here.
//
// The entrance runs through the state machine because the Nitro runtime has
// no `animationName` prop. The artboard carries a single timeline, `CardsIn`,
// which the state machine plays on entry, so the two are equivalent here.

/** Artboard holding the stacked-cards entrance animation. */
const RIVE_ARTBOARD_CARDS = 'cards';

/** State machine that plays the `CardsIn` entrance on entry. */
const RIVE_STATE_MACHINE = 'State Machine 1';

/**
 * Wall-clock length of the `CardsIn` entrance: a 47-frame work area at 60fps,
 * played at the timeline's authored 0.6x speed.
 */
export const CARDS_IN_DURATION_MS = 1306;

interface CardWelcomeCardsAnimationProps {
  animate: boolean;
  style: StyleProp<ImageStyle>;
  /**
   * Called when Rive fails and the static cards image takes over, so callers
   * sequencing other content off this entrance can stop waiting for it.
   */
  onRiveError?: () => void;
  testID?: string;
}

const CardWelcomeCardsAnimation = ({
  animate,
  style,
  onRiveError,
  testID,
}: CardWelcomeCardsAnimationProps) => {
  const [hasRiveError, setHasRiveError] = useState(false);
  const { riveFile, error: riveFileError } = useRiveFile(
    CardEducationAnimation,
  );

  const handleError = useCallback(
    (riveError: RiveError) => {
      log(`Rive error: ${riveError.message}`);
      setHasRiveError(true);
      onRiveError?.();
    },
    [onRiveError],
  );

  // The Nitro runtime loads the file in JS, so a failed load never reaches
  // `onError` on the view: without this the cards would stay blank forever
  // and callers would keep waiting on an entrance that never runs.
  useEffect(() => {
    if (!riveFileError) {
      return;
    }
    log(`Rive file failed to load: ${riveFileError.message}`);
    setHasRiveError(true);
    onRiveError?.();
  }, [riveFileError, onRiveError]);

  if (animate && !hasRiveError) {
    const riveStyle: ViewStyle = StyleSheet.flatten(style);
    return riveFile ? (
      <RiveView
        file={riveFile}
        artboardName={RIVE_ARTBOARD_CARDS}
        stateMachineName={RIVE_STATE_MACHINE}
        autoPlay
        fit={Fit.Contain}
        style={riveStyle}
        onError={handleError}
        testID={testID ?? CardWelcomeSelectors.CARDS_ANIMATION}
      />
    ) : null;
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
