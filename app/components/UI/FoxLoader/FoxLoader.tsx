import React, { useCallback, useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alignment,
  Fit,
  RiveErrorType,
  RiveView,
  useRive,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { hideAsync } from 'expo-splash-screen';
import { useStyles } from '../../../component-library/hooks';
import Logger from '../../../util/Logger';
import { hasTestOverrides } from '../../../util/test/utils';
import { OnboardingRiveAnimationIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useRivePerformance } from '../../../hooks/performance/useRivePerformance';
import styleSheet from './FoxLoader.styles';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const splashRiveFile = require('../../../animations/splash_screen.riv');

const SPLASH_STATE_MACHINE = 'Splash_animation';
// Maximum time to wait for the animation to complete before forcing the app to show.
// Guards against silent failures: corrupted .riv file, stuck state machine, unsupported renderer.
const ANIMATION_TIMEOUT_MS = 3_000;
// The Nitro runtime has no `onStateChanged`, so reaching the authored
// `ExitState` can't be observed. Completion is timed instead: after firing the
// `Stop` trigger, the app is revealed once the exit animation has had time to
// play out (the global timeout above still caps the worst case).
const EXIT_ANIMATION_MS = 800;

// Persist across remounts so animation state is consistent for the app session
let animationStarted = false;
let animationComplete = false;

interface FoxLoaderProps {
  appServicesReady?: boolean;
  onAnimationComplete?: () => void;
}

const FoxLoaderE2E = ({
  onAnimationComplete = () => undefined,
}: Pick<FoxLoaderProps, 'onAnimationComplete'>) => {
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    hideAsync().catch((error: unknown) =>
      Logger.error(error as Error, 'Failed to hide splash screen in E2E mode'),
    );
    // eslint-disable-next-line react-compiler/react-compiler
    animationComplete = true;
    onAnimationCompleteRef.current?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const FoxLoaderAnimation = ({
  appServicesReady = false,
  onAnimationComplete = () => undefined,
}: FoxLoaderProps) => {
  const screenDims = Dimensions.get('screen');
  const screenH = screenDims.height;
  const screenW = screenDims.width;
  const { styles } = useStyles(styleSheet, { screenH, screenW });
  const { riveFile } = useRiveFile(splashRiveFile);
  const { riveRef, riveViewRef, setHybridRef } = useRive();
  const isPlaying = riveViewRef != null;
  const exitTriggered = useRef(false);
  const isCompleteRef = useRef(animationComplete);
  const isPlayingRef = useRef(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;
  const staticFoxOpacity = useRef(new Animated.Value(1)).current;
  const riveOpacity = useRef(new Animated.Value(0)).current;
  const { riveHandlers } = useRivePerformance({
    animationId: OnboardingRiveAnimationIds.FOX_LOADER,
    timeoutMs: ANIMATION_TIMEOUT_MS,
  });

  const completeAnimation = useCallback(() => {
    if (isCompleteRef.current) return;
    // eslint-disable-next-line react-compiler/react-compiler
    animationComplete = true;
    isCompleteRef.current = true;
    onAnimationCompleteRef.current?.();
  }, []);

  const startAnimation = useCallback(() => {
    if (animationStarted) return;
    try {
      // eslint-disable-next-line react-compiler/react-compiler
      animationStarted = true;
      riveRef.current?.triggerInput('Start');
    } catch (error) {
      Logger.error(
        error as Error,
        'Error triggering splash screen Rive animation',
      );
    }
  }, [riveRef]);

  const stopAnimation = useCallback(() => {
    if (exitTriggered.current) return;
    try {
      exitTriggered.current = true;
      riveRef.current?.triggerInput('Stop');
    } catch (error) {
      Logger.error(
        error as Error,
        'Error stopping splash screen Rive animation',
      );
    }
  }, [riveRef]);

  useEffect(() => {
    if (!isPlaying) return;
    riveHandlers.onPlay();
    isPlayingRef.current = true;
    startAnimation();
    // Show Rive immediately, then fade the static fox out over a short duration.
    // Instant setValue(0) causes a single blank frame on Android because Rive's
    // canvas needs a frame or two to composite after playback starts.
    riveOpacity.setValue(1);
    Animated.timing(staticFoxOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, riveHandlers, startAnimation, staticFoxOpacity, riveOpacity]);

  // Skip animation if it already completed this session (remount)
  useEffect(() => {
    if (animationComplete) {
      onAnimationCompleteRef.current?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback: if the animation hasn't completed within the timeout, force the app to show.
  // Covers silent failures: corrupted .riv file, stuck state machine, unsupported renderer.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isCompleteRef.current) {
        // Expected on devices where Rive can't play (e.g. unsupported renderer on
        // low-end Android); the static fox fallback handles it. Log without
        // raising a Sentry error.
        if (!animationComplete) {
          Logger.log('FoxLoader: forcing app reveal after timeout');
        }
        // Ensure the native splash is hidden even if onLoad never fired on the static fox image.
        hideAsync().catch((error: unknown) =>
          Logger.error(
            error as Error,
            'Failed to hide splash screen in timeout fallback',
          ),
        );
        completeAnimation();
      }
    }, ANIMATION_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [completeAnimation]);

  // Once app is ready and the fox is playing, fire the exit trigger and
  // complete on a timer. Legacy observed `onStateChanged`/`ExitState`;
  // Nitro exposes neither signal, so completion is timed instead.
  useEffect(() => {
    if (!appServicesReady || !isPlaying || exitTriggered.current) {
      return undefined;
    }
    stopAnimation();
    const timer = setTimeout(completeAnimation, EXIT_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [appServicesReady, isPlaying, stopAnimation, completeAnimation]);

  return (
    <SafeAreaView
      testID={FoxLoaderSelectorsIDs.CONTAINER}
      style={styles.container}
    >
      <View
        testID={FoxLoaderSelectorsIDs.ANIMATION_WRAPPER}
        style={[styles.animationWrapper]}
      >
        <Animated.Image
          testID={FoxLoaderSelectorsIDs.STATIC_FOX}
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../images/branding/fox.png')}
          style={[styles.staticFox, { opacity: staticFoxOpacity }]}
          resizeMode="contain"
          onLoad={() => {
            // Hide native splash once static fox is rendered — the static fox
            // (opacity 1) bridges the gap until Rive begins playing, so there
            // is no visible white flash between the two.
            hideAsync().catch((error: unknown) =>
              Logger.error(error as Error, 'Failed to hide splash screen'),
            );
          }}
        />
        <Animated.View
          testID={FoxLoaderSelectorsIDs.RIVE_WRAPPER}
          style={[styles.riveAnimation, { opacity: riveOpacity }]}
        >
          {riveFile && (
            <RiveView
              hybridRef={setHybridRef}
              file={riveFile}
              style={styles.riveAnimation}
              autoPlay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              stateMachineName={SPLASH_STATE_MACHINE}
              onError={(riveError: RiveError) => {
                riveHandlers.onError({
                  message: riveError.message,
                  type: RiveErrorType[riveError.type],
                });
                // Only bail out if Rive never started — runtime errors during playback are non-fatal
                if (!isCompleteRef.current && !isPlayingRef.current) {
                  Logger.error(
                    new Error(riveError.message),
                    `FoxLoader: Rive failed before playback (${
                      RiveErrorType[riveError.type]
                    })`,
                  );
                  // onLoad may not have fired if Rive errored before the image rendered
                  hideAsync().catch((error: unknown) =>
                    Logger.error(
                      error as Error,
                      'Failed to hide splash screen on Rive error',
                    ),
                  );
                  completeAnimation();
                }
              }}
            />
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const FoxLoader = (props: FoxLoaderProps) => {
  if (hasTestOverrides) {
    return <FoxLoaderE2E onAnimationComplete={props.onAnimationComplete} />;
  }

  return <FoxLoaderAnimation {...props} />;
};

export default FoxLoader;

/** @internal Reset animation session flags between test runs. Do not call in production code. */
export const _resetAnimationStateForTesting = () => {
  animationStarted = false;
  animationComplete = false;
};
