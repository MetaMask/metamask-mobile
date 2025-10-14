import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Platform } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import Logger from '../../../util/Logger';
import { isE2E } from '../../../util/test/utils';
import Device from '../../../util/device';
import FoxAnimationRive from '../../../animations/fox_appear.riv';

const getFoxAnimationHeight = (hasFooter: boolean) => {
  if (hasFooter) {
    return Device.isMediumDevice() ? 150 : 180;
  }
  return Device.isMediumDevice() ? 300 : 350;
};

const getSafeBottomPosition = (hasFooter: boolean, insets?: EdgeInsets) => {
  const basePadding = insets?.bottom || 0;

  // iOS specific
  if (Platform.OS === 'ios') {
    if (hasFooter) {
      // Footer case: position above footer + safe area
      return Math.max(100, basePadding + 60);
    }
    if (basePadding > 0) {
      // iPhone X+ with home indicator
      return Math.max(-40, -(basePadding - 10));
    }
    return -20;
  }

  // Android specific
  if (Platform.OS === 'android') {
    // Samsung and other Android devices with gesture navigation
    if (basePadding > 20) {
      return hasFooter
        ? Math.max(100, basePadding + 60)
        : Math.max(-20, basePadding);
    }

    // Standard Android devices
    return hasFooter
      ? Math.max(100, basePadding + 40)
      : Math.max(-20, basePadding - 20);
  }

  // Fallback for other platforms
  return hasFooter ? 100 : -20;
};

const createStyles = (hasFooter: boolean, insets?: EdgeInsets) =>
  StyleSheet.create({
    foxAnimationWrapper: {
      position: 'absolute',
      bottom: getSafeBottomPosition(hasFooter, insets),
      left: 0,
      right: 0,
      height: getFoxAnimationHeight(hasFooter),
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    },
    foxAnimation: {
      width: '100%',
      height: '100%',
    },
  });

const FoxAnimation = ({
  startFoxAnimation,
  hasFooter,
  isLoading = false,
}: {
  startFoxAnimation: boolean;
  hasFooter: boolean;
  isLoading?: boolean;
}) => {
  const foxRef = useRef<RiveRef>(null);
  const insets = useSafeAreaInsets();
  const styles = createStyles(hasFooter, insets);
  const foxOpacity = useMemo(() => new Animated.Value(0), []);

  const showFoxAnimation = useCallback(async () => {
    if (isE2E) {
      foxOpacity.setValue(1);
      return;
    }

    Animated.timing(foxOpacity, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (foxRef.current) {
        try {
          const trigger = isLoading ? 'Loader' : 'Start';
          foxRef.current?.fireState('FoxRaiseUp', trigger);
        } catch (error) {
          Logger.error(error as Error, 'Error triggering Fox Rive animation');
        }
      }
    });
  }, [foxOpacity, foxRef, isLoading]);

  useEffect(() => {
    if (startFoxAnimation) {
      showFoxAnimation();
    }
  }, [startFoxAnimation, showFoxAnimation]);

  return (
    <Animated.View
      style={[
        styles.foxAnimationWrapper,
        {
          opacity: foxOpacity,
        },
      ]}
    >
      <Rive
        ref={foxRef}
        style={styles.foxAnimation}
        source={FoxAnimationRive}
        fit={Fit.Contain}
        alignment={Alignment.Center}
        autoplay={false}
        stateMachineName="FoxRaiseUp"
        testID="fox-animation"
      />
    </Animated.View>
  );
};

export default FoxAnimation;
