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

// Persists across remounts so the animation only plays once per app session
let animationStarted = false;

// Use Canvas renderer on Android — the default Rive SurfaceView causes geometry distortion
if (Platform.OS === 'android') {
  RiveRenderer.defaultRenderer(
    RiveRendererIOS.Rive,
    RiveRendererAndroid.Canvas,
  );
}

interface FoxLoaderProps {
  appServicesReady: boolean;
  onAnimationComplete: () => void;
}

const FoxLoader = ({
  appServicesReady,
  onAnimationComplete,
}: FoxLoaderProps) => {
  const { styles } = useStyles(styleSheet, {});
  const riveRef = useRef<RiveRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const exitTriggered = useRef(false);
  const isCompleteRef = useRef(false);
  const staticFoxOpacity = useRef(new Animated.Value(1)).current;
  const riveOpacity = useRef(new Animated.Value(0)).current;

  const startAnimation = useCallback(() => {
    if (isE2E || animationStarted) return;
    try {
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

  // Once both the app is ready and the fox is in its idle loop, fire the exit animation
  useEffect(() => {
    if (appServicesReady && isIdle) {
      stopAnimation();
    }
  }, [appServicesReady, isIdle, stopAnimation]);

  return (
    <View style={[styles.container, isComplete && styles.hidden]}>
      <View style={styles.animationWrapper}>
        <Animated.Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../images/branding/fox.png')}
          style={[styles.staticFox, { opacity: staticFoxOpacity }]}
          resizeMode="contain"
          onLoad={() => hideAsync()}
        />
        <Animated.View style={[styles.riveAnimation, { opacity: riveOpacity }]}>
          <Rive
            ref={riveRef}
            source={splashRiveFile}
            style={styles.riveAnimation}
            autoplay
            fit={Fit.Contain}
            alignment={Alignment.Center}
            stateMachineName={SPLASH_STATE_MACHINE}
            onPlay={() => setIsPlaying(true)}
            onStateChanged={(_machineName, stateName) => {
              if (isCompleteRef.current) return;
              setIsIdle(stateName === 'Blink and look around (Shorter)');
              if (exitTriggered.current && stateName === 'ExitState') {
                isCompleteRef.current = true;
                setIsComplete(true);
                onAnimationComplete();
              }
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export default FoxLoader;
