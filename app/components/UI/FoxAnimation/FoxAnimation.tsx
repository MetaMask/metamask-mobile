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
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import FoxAnimationRive from '../../../animations/fox_appear.riv';
import { OnboardingRiveAnimationIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useRivePerformance } from '../../../hooks/performance/useRivePerformance';
import { useBottomSafeAreaInset } from '../../hooks/useBottomSafeAreaInset';

// Android reports about 24dp for gesture navigation and 48dp for the opaque
// three-button navigation bar.
const ANDROID_OPAQUE_NAV_BAR_MIN_INSET = 40;

const getFoxAnimationHeight = (hasFooter: boolean) => {
  if (hasFooter) {
    return Device.isMediumDevice() ? 150 : 180;
  }
  return Device.isMediumDevice() ? 300 : 350;
};

export interface FoxSafeBottomOptions {
  /**
   * Parent paints under the Android system nav / gesture area (e.g. Onboarding
   * root canvas with top-only SafeArea). Gesture navigation uses a negative
   * bottom so the fox sits flush; an opaque three-button bar is cleared.
   * Login must leave this false because its SafeAreaView applied the inset.
   */
  fullBleedBottom?: boolean;
}

export const getSafeBottomPosition = (
  hasFooter: boolean,
  bottomInset = 0,
  options?: FoxSafeBottomOptions,
) => {
  if (hasFooter) {
    if (Platform.OS === 'ios') {
      return Math.max(100, bottomInset + 60);
    }
    if (Platform.OS === 'android') {
      return Math.max(100, bottomInset + (bottomInset > 20 ? 60 : 40));
    }
    return 100;
  }

  if (Platform.OS === 'ios') {
    if (bottomInset > 0) {
      return Math.max(-40, -(bottomInset - 10));
    }
    return -20;
  }

  if (Platform.OS === 'android') {
    if (options?.fullBleedBottom) {
      // The full-bleed canvas still paints behind the system bar, but the fox
      // artwork must stay above an opaque three-button navigation bar.
      if (bottomInset >= ANDROID_OPAQUE_NAV_BAR_MIN_INSET) {
        return bottomInset;
      }
      // Gesture navigation is mostly transparent, so tuck the art into it to
      // avoid a visible strip between the fox and the bottom of the screen.
      if (bottomInset > 0) {
        return Math.max(-40, -(bottomInset - 10));
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
  // RN 0.86 can report a zero safe-area inset while Android's navigation bar
  // still occupies the bottom of the window. The shared hook derives a
  // fallback from the safe-area frame for that case.
  const bottomInset = useBottomSafeAreaInset();
  const bottom = getSafeBottomPosition(hasFooter, bottomInset, {
    fullBleedBottom,
  });
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
