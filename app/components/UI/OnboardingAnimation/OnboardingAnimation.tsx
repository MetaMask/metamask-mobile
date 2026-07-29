import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import {
  Alignment,
  Fit,
  RiveErrorType,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';

import MetaMaskWordmarkAnimation from '../../../animations/metamask_wordmark_animation_build-up.riv';
import { hasTestOverrides } from '../../../util/test/utils';
import Logger from '../../../util/Logger';
import { OnboardingRiveAnimationIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useRivePerformance } from '../../../hooks/performance/useRivePerformance';

import { useAppThemeFromContext } from '../../../util/theme';
import Device from '../../../util/device';

const createStyles = () =>
  StyleSheet.create({
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
    },
    largeFoxWrapper: {
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 'auto',
      padding: Device.isMediumDevice() ? 30 : 40,
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -(Device.isMediumDevice() ? 90 : 120),
      marginTop: -(Device.isMediumDevice() ? 90 : 120),
    },
    createWrapper: {
      flexDirection: 'column',
      rowGap: Device.isMediumDevice() ? 12 : 16,
      marginBottom: 16,
      position: 'absolute',
      top: '50%',
      left: Device.isMediumDevice() ? 26 : 36,
      right: Device.isMediumDevice() ? 26 : 36,
      marginTop: 180,
      alignItems: 'stretch',
    },
    titleWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      flex: 1,
      rowGap: Device.isMediumDevice() ? 24 : 32,
    },
  });

const OnboardingAnimation = ({
  children,
  startOnboardingAnimation,
  setStartFoxAnimation,
  onInteractiveContentReady,
}: {
  children: React.ReactNode;
  startOnboardingAnimation: boolean;
  setStartFoxAnimation: (value: boolean) => void;
  // Must be referentially stable; it feeds the animation callbacks' dependencies.
  onInteractiveContentReady?: () => void;
}) => {
  const { riveFile } = useRiveFile(MetaMaskWordmarkAnimation);
  // riveViewRef only becomes available once the view is ready to receive
  // inputs — the Nitro equivalent of the legacy onPlay gate.
  const { riveViewRef, setHybridRef } = useRive();
  const logoPosition = useMemo(() => new Animated.Value(0), []);
  const buttonsOpacity = useMemo(
    () => new Animated.Value(hasTestOverrides ? 1 : 0),
    [],
  );

  const { themeAppearance } = useAppThemeFromContext();
  const styles = createStyles();

  const hasReportedInteractiveContent = useRef(false);
  const { riveHandlers } = useRivePerformance({
    animationId: OnboardingRiveAnimationIds.ONBOARDING_WORDMARK,
    timeoutMs: 5_000,
    enabled: !hasTestOverrides,
  });

  const reportInteractiveContentReady = useCallback(() => {
    if (hasReportedInteractiveContent.current) {
      return;
    }
    hasReportedInteractiveContent.current = true;
    onInteractiveContentReady?.();
  }, [onInteractiveContentReady]);

  const moveLogoUp = useCallback(() => {
    Animated.parallel([
      Animated.timing(logoPosition, {
        toValue: -180,
        duration: 1200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        reportInteractiveContentReady();
      }
    });
  }, [logoPosition, buttonsOpacity, reportInteractiveContentReady]);

  const startRiveAnimation = useCallback(() => {
    if (hasTestOverrides) {
      logoPosition.setValue(-180);
      buttonsOpacity.setValue(1);
      setStartFoxAnimation(true);
      reportInteractiveContentReady();
      return;
    }

    try {
      if (riveViewRef) {
        const isDarkMode = themeAppearance === 'dark';
        riveViewRef.setBooleanInputValue('Dark', isDarkMode);
        riveViewRef.triggerInput('Start');
        setTimeout(() => {
          moveLogoUp();
        }, 1000);

        setTimeout(() => {
          setStartFoxAnimation(true);
        }, 1200);
      }
    } catch (error) {
      Logger.error(error as Error, 'Error triggering Rive animation');
    }
  }, [
    themeAppearance,
    moveLogoUp,
    riveViewRef,
    setStartFoxAnimation,
    logoPosition,
    buttonsOpacity,
    reportInteractiveContentReady,
  ]);

  // Report the performance "play" milestone once the view is ready.
  useEffect(() => {
    if (riveViewRef) {
      riveHandlers.onPlay();
    }
  }, [riveViewRef, riveHandlers]);

  useEffect(() => {
    if (startOnboardingAnimation && (riveViewRef || hasTestOverrides)) {
      startRiveAnimation();
    }
  }, [startRiveAnimation, startOnboardingAnimation, riveViewRef]);

  return (
    <>
      <View style={styles.titleWrapper} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.largeFoxWrapper,
            {
              transform: [{ translateY: logoPosition }],
            },
          ]}
          pointerEvents="none"
        >
          {!hasTestOverrides && riveFile && (
            <RiveView
              hybridRef={setHybridRef}
              style={styles.image}
              file={riveFile}
              autoPlay
              fit={Fit.Contain}
              alignment={Alignment.Center}
              stateMachineName="WordmarkBuildUp"
              testID="metamask-wordmark-animation"
              onError={(riveError) => {
                riveHandlers.onError({
                  message: riveError.message,
                  type: RiveErrorType[riveError.type],
                });
              }}
            />
          )}
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.createWrapper,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: logoPosition }],
          },
        ]}
        pointerEvents="box-none"
      >
        {children}
      </Animated.View>
    </>
  );
};

export default OnboardingAnimation;
