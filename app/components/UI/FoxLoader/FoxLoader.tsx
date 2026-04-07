import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Animated, Platform } from 'react-native';
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
import { isE2E } from '../../../util/test/utils';
import Logger from '../../../util/Logger';
import styleSheet from './FoxLoader.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const splashRiveFile = require('../../../animations/splash_screen.riv');

const SPLASH_STATE_MACHINE = 'Splash_animation';
const STYLE_PARAMS = {};
const SPLASH_IDLE_STATE = 'Blink and look around (Shorter)';

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
  appServicesReady: boolean;
  onAnimationComplete: () => void;
}

const FoxLoader = ({
  appServicesReady,
  onAnimationComplete,
}: FoxLoaderProps) => {
  const { styles } = useStyles(styleSheet, STYLE_PARAMS);
  const riveRef = useRef<RiveRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const exitTriggered = useRef(false);
  const isCompleteRef = useRef(animationComplete);
  const isPlayingRef = useRef(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;
  const staticFoxOpacity = useRef(new Animated.Value(1)).current;
  const riveOpacity = useRef(new Animated.Value(0)).current;

  const startAnimation = useCallback(() => {
    if (isE2E || animationStarted) return;
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

  // If the animation already completed this session (remount), skip it immediately
  useEffect(() => {
    if (animationComplete) {
      onAnimationCompleteRef.current?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once both the app is ready and the fox is in its idle loop, fire the exit animation
  useEffect(() => {
    if (appServicesReady && isIdle) {
      stopAnimation();
    }
  }, [appServicesReady, isIdle, stopAnimation]);

  return (
    <View
      testID="fox-loader-container"
      style={[styles.container, isComplete && styles.hidden]}
    >
      <View
        testID="fox-loader-animation-wrapper"
        style={styles.animationWrapper}
      >
        <Animated.Image
          testID="fox-loader-static-fox"
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
          testID="fox-loader-rive-wrapper"
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
                setIsComplete(true);
                onAnimationCompleteRef.current?.();
              }
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export default FoxLoader;

/** @internal Reset animation session flags between test runs. Do not call in production code. */
export const _resetAnimationStateForTesting = () => {
  animationStarted = false;
  animationComplete = false;
};
