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

export interface FoxSafeBottomOptions {
  /**
   * Parent paints under the Android system nav / gesture area (e.g. Onboarding
   * root canvas with top-only SafeArea). When true, Android uses a negative
   * bottom like iOS so the fox sits flush (no cream strip under the art).
   * Login must leave this false — its SafeAreaView already applied the inset.
   */
  fullBleedBottom?: boolean;
}

export const getSafeBottomPosition = (
  hasFooter: boolean,
  insets?: EdgeInsets,
  options?: FoxSafeBottomOptions,
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
    // Positive insets.bottom lifts the fox and leaves a cream/white strip under
    // the graphic on full-bleed onboarding. Tuck like iOS instead.
    if (options?.fullBleedBottom) {
      if (basePadding > 0) {
        return Math.max(-40, -(basePadding - 10));
      }
      // Edge-to-edge often reports 0 inset; still pull slightly into the gesture area.
      return -20;
    }
    // Login (and other bottom-safe parents): do not double-count the inset.
    return 0;
  }

  return -20;
};

const styles = StyleSheet.create({
  foxAnimationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
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
  fullBleedBottom = false,
}: {
  hasFooter: boolean;
  trigger?: 'Loader' | 'Start';
  fullBleedBottom?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const bottom = getSafeBottomPosition(hasFooter, insets, { fullBleedBottom });
  const height = getFoxAnimationHeight(hasFooter);

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
    <View style={[styles.foxAnimationWrapper, { bottom, height }]}>
      {riveFile && (
        <RiveView
          hybridRef={setHybridRef}
          style={styles.foxAnimation}
          file={riveFile}
          autoPlay
          fit={Fit.Contain}
          alignment={hasFooter ? Alignment.Center : Alignment.BottomCenter}
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
