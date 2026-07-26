import React, { useCallback, useEffect, useRef } from 'react';
import { View, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hideAsync } from 'expo-splash-screen';
import { useStyles } from '../../../component-library/hooks';
import Logger from '../../../util/Logger';
import { hasTestOverrides } from '../../../util/test/utils';
import styleSheet from './FoxLoader.styles';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';

// Maximum time to wait before forcing the app to show, in case appServicesReady
// never resolves. Guards against the splash hanging indefinitely.
const ANIMATION_TIMEOUT_MS = 3_000;

// Persist across remounts so reveal state is consistent for the app session
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
  const isCompleteRef = useRef(animationComplete);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  const complete = useCallback(() => {
    if (isCompleteRef.current) return;
    // eslint-disable-next-line react-compiler/react-compiler
    animationComplete = true;
    isCompleteRef.current = true;
    onAnimationCompleteRef.current?.();
  }, []);

  // Skip if reveal already happened this session (remount)
  useEffect(() => {
    if (animationComplete) {
      onAnimationCompleteRef.current?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal the app as soon as services are ready — there is no animation to wait for.
  useEffect(() => {
    if (appServicesReady) {
      complete();
    }
  }, [appServicesReady, complete]);

  // Fallback: force the app to show if services never report ready within the timeout.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isCompleteRef.current) {
        Logger.log('FoxLoader: forcing app reveal after timeout');
        hideAsync().catch((error: unknown) =>
          Logger.error(
            error as Error,
            'Failed to hide splash screen in timeout fallback',
          ),
        );
        complete();
      }
    }, ANIMATION_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [complete]);

  return (
    <SafeAreaView
      testID={FoxLoaderSelectorsIDs.CONTAINER}
      style={styles.container}
    >
      <View
        testID={FoxLoaderSelectorsIDs.ANIMATION_WRAPPER}
        style={[styles.animationWrapper]}
      >
        <Image
          testID={FoxLoaderSelectorsIDs.STATIC_FOX}
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../images/branding/fox.png')}
          style={styles.staticFox}
          resizeMode="contain"
          onLoad={() => {
            // Hide the native splash once the static fox is rendered.
            hideAsync().catch((error: unknown) =>
              Logger.error(error as Error, 'Failed to hide splash screen'),
            );
          }}
        />
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
  animationComplete = false;
};
