import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Animated, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Rive, {
  Fit,
  Alignment,
  RiveRef,
  RiveRenderer,
  RiveRendererIOS,
  RiveRendererAndroid,
} from 'rive-react-native';
import { hideAsync } from 'expo-splash-screen';
import { useStyles } from '../../../component-library/hooks';
import Logger from '../../../util/Logger';
import styleSheet from './FoxLoader.styles';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const splashRiveFile = require('../../../animations/splash_screen.riv');

const SPLASH_STATE_MACHINE = 'Splash_animation';
const SPLASH_IDLE_STATE = 'Blink and look around (Shorter)';
// Maximum time to wait for the animation to complete before forcing the app to show.
// Guards against silent failures: corrupted .riv file, stuck state machine, unsupported renderer.
const ANIMATION_TIMEOUT_MS = 5_000;

// Persist across remounts so animation state is consistent for the app session
let animationStarted = false;
let animationComplete = false;

// Use Canvas renderer on Android — the default Rive SurfaceView causes geometry distortion
if (Platform.OS === 'android') {
  try {
    RiveRenderer.defaultRenderer(
      RiveRendererIOS.Rive,
      RiveRendererAndroid.Canvas,
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to set Rive Canvas renderer on Android',
    );
  }
}

interface FoxLoaderProps {
  appServicesReady?: boolean;
  onAnimationComplete?: () => void;
}

const FoxLoader = ({
  appServicesReady = false,
  onAnimationComplete = () => undefined,
}: FoxLoaderProps) => {
  const screenDims = Dimensions.get('screen');
  const screenH = screenDims.height;
  const screenW = screenDims.width;
  const { styles } = useStyles(styleSheet, { screenH, screenW });
  const riveRef = useRef<RiveRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const exitTriggered = useRef(false);
  const isCompleteRef = useRef(animationComplete);
  const isPlayingRef = useRef(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;
  const staticFoxOpacity = useRef(new Animated.Value(1)).current;
  const riveOpacity = useRef(new Animated.Value(0)).current;

  const startAnimation = useCallback(() => {
    if (animationStarted) return;
    try {
      // eslint-disable-next-line react-compiler/react-compiler
      animationStarted = true;
      riveRef.current?.fireState(SPLASH_STATE_MACHINE, 'Start');
    } catch (error) {
      Logger.error(
        error as Error,
        'Error triggering splash screen Rive animation',
      );
    }
  }, []);

  const stopAnimation = useCallback(() => {
    if (exitTriggered.current) return;
    try {
      exitTriggered.current = true;
      riveRef.current?.fireState(SPLASH_STATE_MACHINE, 'Stop');
    } catch (error) {
      Logger.error(
        error as Error,
        'Error stopping splash screen Rive animation',
      );
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startAnimation();
      staticFoxOpacity.setValue(0);
      riveOpacity.setValue(1);
    }
  }, [isPlaying, startAnimation, staticFoxOpacity, riveOpacity]);

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
        // Only log an error if the animation genuinely got stuck globally.
        // If animationComplete is true, the primary instance finished successfully —
        // this is a secondary instance (LockScreen, AppFlow) that mounted mid-animation.
        if (!animationComplete) {
          Logger.error(
            new Error('Splash animation timed out'),
            'FoxLoader: forcing app reveal after timeout',
          );
        }
        // Ensure the native splash is hidden even if onLoad never fired on the static fox image.
        hideAsync().catch((error) =>
          Logger.error(
            error as Error,
            'Failed to hide splash screen in timeout fallback',
          ),
        );
        // eslint-disable-next-line react-compiler/react-compiler
        animationComplete = true;
        isCompleteRef.current = true;
        onAnimationCompleteRef.current?.();
      }
    }, ANIMATION_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once both the app is ready and the fox is in its idle loop, fire the exit animation
  useEffect(() => {
    if (appServicesReady && isIdle) {
      stopAnimation();
    }
  }, [appServicesReady, isIdle, stopAnimation]);

  return (
    <SafeAreaView
      testID={FoxLoaderSelectorsIDs.CONTAINER}
      style={styles.container}
    >
      <View
        testID={FoxLoaderSelectorsIDs.ANIMATION_WRAPPER}
        style={[
          styles.animationWrapper,
          Platform.OS === 'android' && styles.animationWrapperAndroid,
        ]}
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
            hideAsync().catch((error) =>
              Logger.error(error as Error, 'Failed to hide splash screen'),
            );
          }}
        />
        <Animated.View
          testID={FoxLoaderSelectorsIDs.RIVE_WRAPPER}
          style={[styles.riveAnimation, { opacity: riveOpacity }]}
        >
          <Rive
            ref={riveRef}
            source={splashRiveFile}
            style={styles.riveAnimation}
            autoplay
            fit={Fit.Contain}
            alignment={Alignment.Center}
            stateMachineName={SPLASH_STATE_MACHINE}
            onPlay={() => {
              isPlayingRef.current = true;
              setIsPlaying(true);
            }}
            onError={() => {
              // Only bail out if Rive never started — runtime errors during playback are non-fatal
              if (!isCompleteRef.current && !isPlayingRef.current) {
                // onLoad may not have fired if Rive errored before the image rendered
                hideAsync().catch((error) =>
                  Logger.error(
                    error as Error,
                    'Failed to hide splash screen on Rive error',
                  ),
                );
                // eslint-disable-next-line react-compiler/react-compiler
                animationComplete = true;
                isCompleteRef.current = true;
                onAnimationCompleteRef.current?.();
              }
            }}
            onStateChanged={(_machineName, stateName) => {
              if (isCompleteRef.current) return;
              setIsIdle(stateName === SPLASH_IDLE_STATE);
              if (exitTriggered.current && stateName === 'ExitState') {
                // eslint-disable-next-line react-compiler/react-compiler
                animationComplete = true;
                isCompleteRef.current = true;
                onAnimationCompleteRef.current?.();
              }
            }}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default FoxLoader;

/** @internal Reset animation session flags between test runs. Do not call in production code. */
export const _resetAnimationStateForTesting = () => {
  animationStarted = false;
  animationComplete = false;
};
