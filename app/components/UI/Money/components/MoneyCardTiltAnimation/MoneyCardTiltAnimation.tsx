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
import Rive, { AutoBind, Fit, RNRiveError, RiveRef } from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardTiltAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { useRiveTiltWriter } from '../../hooks/useRiveTiltWriter';
import {
  shapeCardTilt,
  pitchToParallaxValue,
  tiltToParallaxValue,
} from '../../utils/parallax';
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
// The per-variant artboards are rendered directly so the component needs no
// imperative setup calls that could race the native view's file load. Each
// board tilts on both axes, driven by `xValue` and `yValue`.

/** Artboard holding the virtual-card tilt. */
const RIVE_ARTBOARD_DIGITAL = 'CardTiltDigital';

/** Artboard holding the metal-card tilt. */
const RIVE_ARTBOARD_METAL = 'CardTiltMetal';

/** ViewModel numbers (0-100, rest 50) driving the tilt per axis. */
const RIVE_PROPERTY_X = 'xValue';
const RIVE_PROPERTY_Y = 'yValue';

const RIVE_TRIGGER_START = 'startAnimation';
/** Tilt does not need it, but a trigger needs a running state machine. */
const RIVE_STATE_MACHINE = 'State Machine 1';
const RIVE_ARTBOARD_ASPECT_RATIO = 620 / 400;

/** Thumbnail size used by the Money home card rows. */
const DEFAULT_WIDTH = 104;
const DEFAULT_HEIGHT = 66;

/** How long to wait for Rive's `onPlay` before firing the reveal anyway. */
const REVEAL_FALLBACK_DELAY_MS = 400;

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
  // Written to via a plain ref rather than `useRiveNumber`: that hook echoes
  // every value back to JS through setState, re-rendering at the accelerometer
  // sample rate for values this component never reads.
  const riveRef = useRef<RiveRef>(null);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const artboardName = isMetalCard
    ? RIVE_ARTBOARD_METAL
    : RIVE_ARTBOARD_DIGITAL;

  const writeTilt = useRiveTiltWriter({
    riveRef,
    xProperty: RIVE_PROPERTY_X,
    yProperty: RIVE_PROPERTY_Y,
    artboardName,
    enabled: animate,
  });

  const applyTilt = useCallback(
    (x: number, y: number) => {
      writeTilt(
        tiltToParallaxValue(shapeCardTilt(x)),
        pitchToParallaxValue(shapeCardTilt(y)),
      );
    },
    [writeTilt],
  );

  useDeviceOrientation(applyTilt, { enabled: animate });

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  // The reveal is a data-bound trigger, so it can only be fired once the
  // native view has loaded the file — `onPlay` is that signal. Firing from an
  // effect alone would race the load and be silently dropped.
  const hasFiredReveal = useRef(false);
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const fireReveal = useCallback(() => {
    if (hasFiredReveal.current) return;
    hasFiredReveal.current = true;

    const dispatchTrigger = () => {
      const rive = riveRef.current;
      // viewTag() is null while the native view is detached; dispatching then
      // throws "found null reactTag".
      if (!rive || rive.viewTag() === null) {
        log('reveal skipped: native view detached');
        return;
      }
      rive.trigger(RIVE_TRIGGER_START);
    };

    if (revealDelayMs > 0) {
      revealTimeout.current = setTimeout(dispatchTrigger, revealDelayMs);
      return;
    }
    dispatchTrigger();
  }, [revealDelayMs]);

  useEffect(() => () => clearTimeout(revealTimeout.current), []);

  const handlePlay = useCallback(() => {
    if (playRevealOnMount) fireReveal();
  }, [playRevealOnMount, fireReveal]);

  // `onPlay` only fires when the runtime actually starts playback. If the state
  // machine settles without emitting it, the reveal would never run at all.
  useEffect(() => {
    if (!playRevealOnMount || !animate) return undefined;
    const timeout = setTimeout(fireReveal, REVEAL_FALLBACK_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [playRevealOnMount, animate, fireReveal]);

  const size = useMemo(
    () =>
      fillWidth
        ? { width: '100%' as const, aspectRatio: RIVE_ARTBOARD_ASPECT_RATIO }
        : { width, height },
    [fillWidth, width, height],
  );

  let content: React.ReactNode;
  if (animate) {
    content = (
      <Rive
        // Remount per artboard: swapping `artboardName` in place reloads the
        // artboard but leaves data binding pointing at the previous one.
        key={artboardName}
        ref={riveRef}
        source={CardTiltAnimation}
        artboardName={artboardName}
        stateMachineName={playRevealOnMount ? RIVE_STATE_MACHINE : undefined}
        dataBinding={AutoBind(true)}
        fit={Fit.Contain}
        style={size}
        onPlay={handlePlay}
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
