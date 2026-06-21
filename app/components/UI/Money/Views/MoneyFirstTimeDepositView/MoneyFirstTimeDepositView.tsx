import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, PixelRatio, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { type StackNavigationProp } from '@react-navigation/stack';
import { Accelerometer } from 'expo-sensors';
import Rive, {
  AutoBind,
  useRive,
  useRiveString,
  useRiveTrigger,
  Fit,
  RNRiveError,
} from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { SCREEN_NAMES } from '../../constants/moneyEvents';
import { MoneyFirstTimeDepositViewTestIds } from './MoneyFirstTimeDepositView.testIds';
import useMountEffect from '../../hooks/useMountEffect';

const log = createProjectLogger('money-first-time-deposit');

// -- Rive animation assets ------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const MoneyFirstTimeDepositAnimationWithParallaxV2 = require('../../../../../animations/money_account_first_time_deposit_with_parallax_v2.riv');

// -- Rive data-binding names ----------------------------------------------
// These MUST match the names authored in the .riv file. If the Rive designer
// renames any of these, update the constants here to keep the binding working.

/** Name of the Rive artboard that contains the first-time deposit animation. */
const RIVE_ARTBOARD_NAME = 'Intro';

/** Trigger that kicks off the intro animation sequence. Fire once on mount. */
const RIVE_START_TRIGGER = 'start';

/** Trigger fired by the Rive "Done" button. Listened to for navigating home. */
const RIVE_DONE_TRIGGER = 'done';

/** Text data-binding path for the headline shown during the animation. */
const RIVE_TITLE_PATH = 'title';

/** Text data-binding path for the button text shown during the animation. */
const BUTTON_TEXT_PATH = 'button';

/** Text data-binding path for the body copy shown during the animation. */
const RIVE_CONTENT_PATH = 'content';

/** Number data-binding (0–100) for horizontal parallax driven by device tilt. */
const RIVE_X_VALUE_PATH = 'xValue';

/** Number data-binding (0–100) for vertical parallax driven by device tilt. */
const RIVE_Y_VALUE_PATH = 'yValue';

// -- Accelerometer / parallax tuning constants ----------------------------

/**
 * How often (ms) the device delivers a new accelerometer reading.
 * 33 ms ≈ 30 readings/sec. Lower = smoother but more CPU/battery.
 */
const SENSOR_POLL_INTERVAL_MS = 33;

/**
 * Exponential Moving Average (EMA) smoothing factor applied each frame.
 * Formula: smoothedValue += SMOOTHING_FACTOR * (targetValue - smoothedValue)
 *
 * Range 0 to 1:
 * 0.05 = very smooth / floaty, significant lag behind real tilt
 * 0.12 = balanced — absorbs hand tremor, still tracks intentional tilt
 * 0.40 = snappy, almost raw — good for fast-moving effects
 * 1.00 = no smoothing at all (raw sensor, jittery)
 */
const SMOOTHING_FACTOR = 0.04;

/**
 * Maximum accelerometer g-force that maps to the 0 or 100 parallax extreme.
 * Anything beyond this is clamped. Determines how far you must tilt to reach
 * full parallax range.
 *
 * 0.15 = ~8° tilt, very sensitive, small wrist movements register
 * 0.30 = ~17° tilt, moderate, deliberate tilt needed
 * 0.50 = ~30° tilt, conservative, phone must be angled significantly
 */
const TILT_SENSITIVITY = 0.5;

/**
 * Duration (ms) of the calibration window on mount. During this window the
 * accelerometer averages the device's resting orientation to establish a
 * "neutral baseline". This means parallax is relative to how the user
 * actually holds their phone, not relative to perfectly flat.
 *
 * Parallax stays centered (50, 50) during calibration so the text reveal
 * animation plays cleanly regardless of hold angle.
 */
const CALIBRATION_DURATION_MS = 300;

/**
 * Converts a raw accelerometer g-force value (relative to baseline) into
 * the 0-100 parallax range expected by the Rive data bindings.
 *
 * -TILT_SENSITIVITY maps to 0 (tilted fully one direction)
 * 0 maps to 50 (neutral / resting position)
 * +TILT_SENSITIVITY maps to 100 (tilted fully the other direction)
 *
 * Values outside the range are clamped to prevent overshooting.
 */
function gForceToParallax(gForce: number): number {
  const clamped = Math.max(
    -TILT_SENSITIVITY,
    Math.min(TILT_SENSITIVITY, gForce),
  );
  return ((clamped / TILT_SENSITIVITY + 1) / 2) * 100;
}

const MoneyFirstTimeDepositView = () => {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();

  const { trackScreenViewed } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_FIRST_TIME_DEPOSIT,
  });

  const goHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  useMountEffect(trackScreenViewed);

  // Intercept Android hardware-back so it behaves like tapping "Done".
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [goHome]);

  // -- Rive setup ---------------------------------------------------------

  const [ref, riveRef] = useRive();

  // Flips true once data bindings are established. Guards accelerometer
  // pushes so they don't fire before Rive is ready to accept values.
  const dataBindingsReady = useRef(false);

  const [, setTitle] = useRiveString(riveRef, RIVE_TITLE_PATH);
  const [, setContent] = useRiveString(riveRef, RIVE_CONTENT_PATH);
  const [, setButtonText] = useRiveString(riveRef, BUTTON_TEXT_PATH);

  const fireStart = useRiveTrigger(riveRef, RIVE_START_TRIGGER);

  // Listen for the Rive "Done" button trigger → navigate home.
  useRiveTrigger(riveRef, RIVE_DONE_TRIGGER, () => {
    goHome();
  });

  // Once the Rive ref is ready, inject i18n text and kick off the animation.
  useEffect(() => {
    if (!riveRef) return;

    setTitle(strings('money.first_time_deposit.title'));
    setContent(strings('money.first_time_deposit.content'));
    setButtonText(strings('money.first_time_deposit.button_text'));

    fireStart?.();
    dataBindingsReady.current = true;
  }, [riveRef, setTitle, setContent, fireStart, setButtonText]);

  // -- Accelerometer-driven parallax --------------------------------------
  //
  // Architecture (two decoupled loops):
  //
  //   Accelerometer listener  →  writes raw target values into refs
  //                               (runs at SENSOR_POLL_INTERVAL_MS)
  //
  //   requestAnimationFrame   →  reads targets, applies EMA smoothing,
  //                               pushes smoothed values to Rive
  //                               (runs at display refresh rate)
  //
  // This avoids flooding the React Native bridge when the sensor fires
  // faster than the screen can render.
  //
  // On mount, a short calibration phase averages the device's resting
  // orientation so that "neutral" = however the user holds their phone.

  // EMA-smoothed values that get pushed to Rive each frame. Start centered.
  const smoothedX = useRef(50);
  const smoothedY = useRef(50);

  // Raw parallax targets written by the sensor listener.
  const targetX = useRef(50);
  const targetY = useRef(50);

  // Resting orientation learned during calibration. Null until calibrated.
  const restingBaseline = useRef<{ x: number; y: number } | null>(null);

  // Running sum/count for the calibration window's average.
  const calibrationAccumulator = useRef({ sumX: 0, sumY: 0, count: 0 });

  // Per-platform accelerometer sign correction.
  //
  // iOS (CoreMotion) reports accelerometer axes with the opposite sign to
  // Android (SensorManager): e.g. resting upright in portrait, iOS reads
  // y ≈ -1 while Android reads y ≈ +1. expo-sensors passes both through without
  // normalizing. Flipping iOS makes a given physical tilt drive parallax
  // identically on both platforms (tilt down → parallax down).
  //
  // Read at runtime (not module scope) so the value reflects Platform.OS on
  // each mount, which also lets tests exercise both platforms by mocking it.
  const axisSign = Platform.OS === 'ios' ? -1 : 1;

  useEffect(() => {
    if (!riveRef) return;

    Accelerometer.setUpdateInterval(SENSOR_POLL_INTERVAL_MS);

    let active = true;
    let rafId: number;
    let subscription: ReturnType<typeof Accelerometer.addListener> | null =
      null;
    const calibrationStartedAt = Date.now();

    try {
      subscription = Accelerometer.addListener(({ x, y }) => {
        if (!active) return;

        const baseline = restingBaseline.current;

        // --- Calibration phase ---
        // Average the accelerometer readings to learn the device's held-rest
        // orientation. Parallax stays centered (50, 50) so the text reveal
        // plays cleanly regardless of how the user is holding the phone.
        if (baseline === null) {
          const acc = calibrationAccumulator.current;
          acc.sumX += x;
          acc.sumY += y;
          acc.count += 1;
          targetX.current = 50;
          targetY.current = 50;

          if (
            Date.now() - calibrationStartedAt >= CALIBRATION_DURATION_MS &&
            acc.count > 0
          ) {
            const baselineValue = {
              x: acc.sumX / acc.count,
              y: acc.sumY / acc.count,
            };
            restingBaseline.current = baselineValue;
          }
          return;
        }

        // --- Live phase ---
        // Subtract the baseline so parallax is relative to the user's
        // resting hold, not relative to "device perfectly flat on a table".
        targetX.current = gForceToParallax(axisSign * (x - baseline.x));
        targetY.current = gForceToParallax(axisSign * (y - baseline.y));
      });
    } catch {
      // Sensor unavailable — parallax stays at static center.
    }

    /** rAF render loop: smooth the raw targets and push to Rive. */
    const renderParallax = () => {
      if (!active || !dataBindingsReady.current) {
        rafId = requestAnimationFrame(renderParallax);
        return;
      }

      smoothedX.current +=
        SMOOTHING_FACTOR * (targetX.current - smoothedX.current);
      smoothedY.current +=
        SMOOTHING_FACTOR * (targetY.current - smoothedY.current);

      try {
        riveRef.setNumber(RIVE_X_VALUE_PATH, smoothedX.current);
        riveRef.setNumber(RIVE_Y_VALUE_PATH, smoothedY.current);
      } catch {
        // Data binding not ready yet — skip this frame.
      }

      rafId = requestAnimationFrame(renderParallax);
    };

    rafId = requestAnimationFrame(renderParallax);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      subscription?.remove();
    };
  }, [riveRef, axisSign]);

  const handleError = useCallback(
    (riveError: RNRiveError) => {
      log(`Rive error: ${riveError.message}`);
      goHome();
    },
    [goHome],
  );

  return (
    <Rive
      ref={ref}
      source={MoneyFirstTimeDepositAnimationWithParallaxV2}
      artboardName={RIVE_ARTBOARD_NAME}
      dataBinding={AutoBind(true)}
      fit={Fit.Layout}
      layoutScaleFactor={PixelRatio.get()}
      onError={handleError}
      testID={MoneyFirstTimeDepositViewTestIds.RIVE_ANIMATION}
    />
  );
};

export default MoneyFirstTimeDepositView;
