import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import {
  Fit,
  RiveView,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardTiltAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useRiveParallaxTilt } from '../../hooks/useRiveParallaxTilt';
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
// wrapper with its `cardType` enum), with their view model bound and tilted
// via `useRiveParallaxTilt` + `dataBind`. The artboards shipped here are
// single-axis (X only), but both `xValue` and `yValue` are wired so a future
// both-axes asset works without code changes.

/**
 * Artboard holding the virtual-card X tilt. The trailing space is authored
 * in the file.
 */
const RIVE_ARTBOARD_DIGITAL = 'Card Tilt X - Digital ';

/** Artboard holding the metal-card X tilt. */
const RIVE_ARTBOARD_METAL = 'Card Tilt X - Metal';

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

  const artboardName = isMetalCard
    ? RIVE_ARTBOARD_METAL
    : RIVE_ARTBOARD_DIGITAL;

  const { riveFile } = useRiveFile(CardTiltAnimation);
  const animate = flagEnabled && !reduceMotion && !hasRiveError;
  const instance = useRiveParallaxTilt(riveFile, {
    artboardName,
    enabled: animate,
  });

  const handleError = useCallback((riveError: RiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  let content: React.ReactNode;
  if (animate) {
    content = riveFile && instance && (
      <RiveView
        // Remount per artboard: swapping `artboardName` in place reloads the
        // artboard but leaves data binding pointing at the previous one.
        key={artboardName}
        file={riveFile}
        artboardName={artboardName}
        dataBind={instance}
        autoPlay
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
