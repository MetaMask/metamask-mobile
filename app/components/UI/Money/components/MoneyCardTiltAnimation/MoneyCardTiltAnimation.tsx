import React, { useCallback, useMemo, useState } from 'react';
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
import { shapeCardTilt } from '../../utils/parallax';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.6.riv';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import styles from './MoneyCardTiltAnimation.styles';
import { MoneyCardTiltAnimationTestIds } from './MoneyCardTiltAnimation.testIds';

const log = createProjectLogger('money-card-tilt');

// -- Rive names ------------------------------------------------------------
// These MUST match the names authored in card_tilt_v1.6.riv. If the Rive
// designer renames any of these, update the constants here.
//
// The per-variant artboards are rendered directly (not through the `MainTilt`
// wrapper with its `cardType` enum), with their view model bound and tilted
// via `useRiveParallaxTilt` + `dataBind`. Each board tilts on both axes,
// driven by `xValue` and `yValue`.

/** Artboard holding the virtual-card tilt. */
const RIVE_ARTBOARD_DIGITAL = 'CardTiltDigital';

/** Artboard holding the metal-card tilt. */
const RIVE_ARTBOARD_METAL = 'CardTiltMetal';

/** Thumbnail size used by the Money home card rows. */
const DEFAULT_WIDTH = 104;
const DEFAULT_HEIGHT = 66;

interface MoneyCardTiltAnimationProps {
  /** Which card variant to show. */
  isMetalCard: boolean;
  /** Rendered width in points. Defaults to the Money home thumbnail size. */
  width?: number;
  /** Rendered height in points. Defaults to the Money home thumbnail size. */
  height?: number;
  testID?: string;
}

const MoneyCardTiltAnimation = ({
  isMetalCard,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  testID,
}: MoneyCardTiltAnimationProps) => {
  const flagEnabled = useSelector(selectMoneyCardTiltAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const artboardName = isMetalCard
    ? RIVE_ARTBOARD_METAL
    : RIVE_ARTBOARD_DIGITAL;

  const shapeTilt = useCallback(
    (x: number, y: number) => ({
      x: shapeCardTilt(x),
      y: shapeCardTilt(y),
    }),
    [],
  );

  const { riveFile } = useRiveFile(CardTiltAnimation);
  const instance = useRiveParallaxTilt(riveFile, {
    artboardName,
    enabled: animate,
    shapeTilt,
  });

  const handleError = useCallback((riveError: RiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  const size = useMemo(() => ({ width, height }), [width, height]);

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
        style={size}
        onError={handleError}
        testID={MoneyCardTiltAnimationTestIds.RIVE}
      />
    );
  } else {
    content = (
      <Image
        source={isMetalCard ? mmCardMetal : mmCardRegular}
        style={[size, styles.staticImage]}
        resizeMode="contain"
        testID={MoneyCardTiltAnimationTestIds.STATIC_IMAGE}
      />
    );
  }

  return (
    <Box
      style={size}
      testID={testID ?? MoneyCardTiltAnimationTestIds.CONTAINER}
    >
      {content}
    </Box>
  );
};

export default MoneyCardTiltAnimation;
