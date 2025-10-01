import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';

import MetaMaskWordmarkAnimation from '../../../animations/metamask_wordmark_animation_build-up.riv';
import { isE2E } from '../../../util/test/utils';
import Logger from '../../../util/Logger';

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
}: {
  children: React.ReactNode;
  startOnboardingAnimation: boolean;
  setStartFoxAnimation: (value: boolean) => void;
}) => {
  const logoRef = useRef<RiveRef>(null);
  const logoPosition = useMemo(() => new Animated.Value(0), []);
  const buttonsOpacity = useMemo(() => new Animated.Value(isE2E ? 1 : 0), []);

  const { themeAppearance } = useAppThemeFromContext();
  const styles = createStyles();

  const moveLogoUp = useCallback(() => {
    if (isE2E) {
      logoPosition.setValue(-180);
      buttonsOpacity.setValue(1);
      setStartFoxAnimation(true);
      return;
    }

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
    ]).start(() => {
      setStartFoxAnimation(true);
    });
  }, [logoPosition, buttonsOpacity, setStartFoxAnimation]);

  const startRiveAnimation = useCallback(() => {
    if (isE2E) {
      moveLogoUp();
      return;
    }

    try {
      if (logoRef.current) {
        const isDarkMode = themeAppearance === 'dark';
        logoRef.current.setInputState('WordmarkBuildUp', 'Dark', isDarkMode);
        logoRef.current.fireState('WordmarkBuildUp', 'Start');
        setTimeout(() => {
          moveLogoUp();
        }, 1000);
      }
    } catch (error) {
      Logger.error(error as Error, 'Error triggering Rive animation');
    }
  }, [themeAppearance, moveLogoUp, logoRef]);

  useEffect(() => {
    if (startOnboardingAnimation) {
      startRiveAnimation();
    }
  }, [startOnboardingAnimation, startRiveAnimation]);

  return (
    <>
      <View style={styles.titleWrapper}>
        <Animated.View
          style={[
            styles.largeFoxWrapper,
            {
              transform: [{ translateY: logoPosition }],
            },
          ]}
        >
          <Rive
            ref={logoRef}
            style={styles.image}
            source={MetaMaskWordmarkAnimation}
            fit={Fit.Contain}
            alignment={Alignment.Center}
            autoplay={false}
            stateMachineName="WordmarkBuildUp"
            testID="metamask-wordmark-animation"
          />
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
      >
        {children}
      </Animated.View>
    </>
  );
};

export default OnboardingAnimation;
