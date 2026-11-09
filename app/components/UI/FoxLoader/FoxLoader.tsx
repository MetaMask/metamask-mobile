import React, { useCallback, useEffect, useRef } from 'react';
import { Image, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hideAsync } from 'expo-splash-screen';
import { useStyles } from '../../../component-library/hooks';
import Logger from '../../../util/Logger';
import { hasTestOverrides } from '../../../util/test/utils';
import styleSheet from './FoxLoader.styles';
import { FoxLoaderSelectorsIDs } from './FoxLoader.testIds';

// Persist across remounts so a completed loader is not shown again this session.
let loaderDismissed = false;

interface FoxLoaderProps {
  appServicesReady?: boolean;
  onAnimationComplete?: () => void;
}

const hideSplashScreen = (context: string) => {
  hideAsync().catch((error: unknown) => Logger.error(error as Error, context));
};

const FoxLoaderE2E = ({
  onAnimationComplete = () => undefined,
}: Pick<FoxLoaderProps, 'onAnimationComplete'>) => {
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    hideSplashScreen('Failed to hide splash screen in E2E mode');
    // eslint-disable-next-line react-compiler/react-compiler
    loaderDismissed = true;
    onAnimationCompleteRef.current?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const FoxLoaderView = ({
  appServicesReady = false,
  onAnimationComplete = () => undefined,
}: FoxLoaderProps) => {
  const screenDims = Dimensions.get('screen');
  const { styles } = useStyles(styleSheet, {
    screenH: screenDims.height,
    screenW: screenDims.width,
  });
  const isDismissedRef = useRef(loaderDismissed);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  const dismissLoader = useCallback(() => {
    if (isDismissedRef.current) return;
    // eslint-disable-next-line react-compiler/react-compiler
    loaderDismissed = true;
    isDismissedRef.current = true;
    hideSplashScreen('Failed to hide splash screen');
    onAnimationCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (loaderDismissed) {
      onAnimationCompleteRef.current?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (appServicesReady) {
      dismissLoader();
    }
  }, [appServicesReady, dismissLoader]);

  return (
    <SafeAreaView
      testID={FoxLoaderSelectorsIDs.CONTAINER}
      style={styles.container}
    >
      <View
        testID={FoxLoaderSelectorsIDs.ANIMATION_WRAPPER}
        style={styles.animationWrapper}
      >
        <Image
          testID={FoxLoaderSelectorsIDs.STATIC_FOX}
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../images/branding/fox.png')}
          style={styles.staticFox}
          resizeMode="contain"
          onLoad={() => {
            // Hide the native splash once this fox is painted, so the handoff
            // stays on the same static fox with no blank frame in between.
            hideSplashScreen('Failed to hide splash screen');
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

  return <FoxLoaderView {...props} />;
};

export default FoxLoader;

/** @internal Reset loader session flags between test runs. Do not call in production code. */
export const _resetAnimationStateForTesting = () => {
  loaderDismissed = false;
};
