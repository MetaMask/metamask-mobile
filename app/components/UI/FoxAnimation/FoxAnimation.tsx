import React, { useEffect } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import {
  Alignment,
  Fit,
  RiveErrorType,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import FoxAnimationRive from '../../../animations/fox_appear.riv';
import { OnboardingRiveAnimationIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useRivePerformance } from '../../../hooks/performance/useRivePerformance';

const getFoxAnimationHeight = (hasFooter: boolean) => {
  if (hasFooter) {
    return Device.isMediumDevice() ? 150 : 180;
  }
  return Device.isMediumDevice() ? 300 : 350;
};

export const getSafeBottomPosition = (
  hasFooter: boolean,
  insets?: EdgeInsets,
) => {
  const basePadding = insets?.bottom || 0;

  if (hasFooter) {
    if (Platform.OS === 'ios') {
      return Math.max(100, basePadding + 60);
    }
    if (Platform.OS === 'android') {
      return Math.max(100, basePadding + (basePadding > 20 ? 60 : 40));
    }
    return 100;
  }

  if (Platform.OS === 'ios') {
    if (basePadding > 0) {
      return Math.max(-40, -(basePadding - 10));
    }
    return -20;
  }

  if (Platform.OS === 'android') {
    return Math.max(0, basePadding);
  }

  return -20;
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
  const insets = useSafeAreaInsets();
  const styles = createStyles(hasFooter, insets);

  const { riveFile } = useRiveFile(FoxAnimationRive);
  const { riveViewRef, setHybridRef } = useRive();
  const { riveHandlers } = useRivePerformance({
    animationId: OnboardingRiveAnimationIds.FOX_APPEAR,
  });

  useEffect(() => {
    if (!riveViewRef) return;
    riveHandlers.onPlay();
    if (!trigger) return;
    try {
      riveViewRef.triggerInput(trigger);
    } catch (error) {
      Logger.error(error as Error, 'Error triggering Fox Rive animation');
    }
  }, [riveViewRef, riveHandlers, trigger]);

  return (
    <View style={[styles.foxAnimationWrapper]}>
      {riveFile && (
        <RiveView
          hybridRef={setHybridRef}
          style={styles.foxAnimation}
          file={riveFile}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          stateMachineName="FoxRaiseUp"
          testID="fox-animation"
          onError={(riveError) => {
            riveHandlers.onError({
              message: riveError.message,
              type: RiveErrorType[riveError.type],
            });
          }}
        />
      )}
    </View>
  );
};

export default FoxAnimation;
