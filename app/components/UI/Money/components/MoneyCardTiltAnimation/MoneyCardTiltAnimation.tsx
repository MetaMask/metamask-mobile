import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import {
  Fit,
  RiveView,
  useRive,
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

/** ViewModel trigger playing the card's entry reveal. */
const RIVE_TRIGGER_START = 'startAnimation';
/** Tilt does not need it, but a trigger needs a running state machine. */
const RIVE_STATE_MACHINE = 'State Machine 1';
const RIVE_ARTBOARD_ASPECT_RATIO = 620 / 400;

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
  fillWidth?: boolean;
  playRevealOnMount?: boolean;
  revealDelayMs?: number;
  testID?: string;
}

const MoneyCardTiltAnimation = ({
  isMetalCard,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  fillWidth = false,
  playRevealOnMount = false,
  revealDelayMs = 0,
  testID,
}: MoneyCardTiltAnimationProps) => {
  const flagEnabled = useSelector(selectMoneyCardTiltAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  // riveViewRef (state) is non-null only after the native view resolves
  // awaitViewReady — gating the reveal on it retries a late-ready view
  // instead of silently dropping the trigger.
  const { riveViewRef, setHybridRef } = useRive();

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

  // The reveal is a data-bound trigger, so it only advances once the view
  // model instance is bound to the running state machine — firing before the
  // native view is ready would be silently dropped.
  const hasFiredReveal = useRef(false);
  useEffect(() => {
    if (
      !playRevealOnMount ||
      !animate ||
      !instance ||
      !riveViewRef ||
      hasFiredReveal.current
    ) {
      return undefined;
    }

    const dispatchTrigger = () => {
      hasFiredReveal.current = true;
      const trigger = instance.triggerProperty(RIVE_TRIGGER_START);
      if (!trigger) {
        log('reveal skipped: trigger property not found');
        return;
      }
      trigger.trigger();
      // A settled state machine won't be advancing when the trigger lands;
      // playIfNeeded is the runtime's low-overhead way to wake it.
      riveViewRef.playIfNeeded();
    };

    if (revealDelayMs > 0) {
      const timeout = setTimeout(dispatchTrigger, revealDelayMs);
      return () => clearTimeout(timeout);
    }
    dispatchTrigger();
    return undefined;
  }, [playRevealOnMount, animate, instance, riveViewRef, revealDelayMs]);

  const size = useMemo(
    () =>
      fillWidth
        ? { width: '100%' as const, aspectRatio: RIVE_ARTBOARD_ASPECT_RATIO }
        : { width, height },
    [fillWidth, width, height],
  );

  let content: React.ReactNode;
  if (animate) {
    content = riveFile && instance && (
      <RiveView
        // Remount per artboard: swapping `artboardName` in place reloads the
        // artboard but leaves data binding pointing at the previous one.
        key={artboardName}
        hybridRef={setHybridRef}
        file={riveFile}
        artboardName={artboardName}
        stateMachineName={playRevealOnMount ? RIVE_STATE_MACHINE : undefined}
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
