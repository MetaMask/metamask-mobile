import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import FoxAnimationRive from '../../../animations/fox_appear.riv';
import { isE2E } from '../../../util/test/utils';

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
  hasFooter,
  trigger,
}: {
  hasFooter: boolean;
  trigger?: 'Loader' | 'Start';
}) => {
  const foxRef = useRef<RiveRef>(null);
  const insets = useSafeAreaInsets();
  const styles = createStyles(hasFooter, insets);

  const [isPlaying, setIsPlaying] = useState(false);

  const showFoxAnimation = useCallback(async () => {
    if (foxRef.current && trigger) {
      try {
        foxRef.current?.fireState('FoxRaiseUp', trigger);
      } catch (error) {
        Logger.error(error as Error, 'Error triggering Fox Rive animation');
      }
    }
  }, [foxRef, trigger]);

  useEffect(() => {
    if (isPlaying) {
      showFoxAnimation();
    }
  }, [showFoxAnimation, isPlaying]);

  // Skip Rive animation during E2E tests to prevent pending animation updates
  // that cause Detox synchronization issues
  if (isE2E) {
    return <View style={[styles.foxAnimationWrapper]} testID="fox-animation" />;
  }

  return (
    <View style={[styles.foxAnimationWrapper]}>
      <Rive
        ref={foxRef}
        style={styles.foxAnimation}
        source={FoxAnimationRive}
        fit={Fit.Contain}
        alignment={Alignment.Center}
        stateMachineName="FoxRaiseUp"
        testID="fox-animation"
        onPlay={() => {
          setIsPlaying(true);
        }}
      />
    </View>
  );
};

export default FoxAnimation;
