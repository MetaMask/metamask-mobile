import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { type SharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  getResistedPullDistance,
  PULL_MOVE_ACTIVATION,
  PULL_REFRESH_THRESHOLD,
  SCROLL_TOP_THRESHOLD,
} from './pullToRefreshConstants';

export interface UsePullToRefreshGestureOptions {
  state: PullToRefreshGestureState;
  onCancel: () => void;
  onCommit: () => void;
  onThreshold: () => void;
  writeRivePulling: (value: boolean) => void;
  writeRiveProgress: (value: number) => void;
}

export interface PullToRefreshGestureState {
  scrollY: SharedValue<number>;
  pullDistance: SharedValue<number>;
  pullProgress: SharedValue<number>;
  initialTouchY: SharedValue<number>;
  initialTouchX: SharedValue<number>;
  gestureType: SharedValue<'pending' | 'active' | null>;
  pullingStateSent: SharedValue<boolean>;
  riveReady: SharedValue<boolean>;
  refreshing: SharedValue<boolean>;
  refreshLock: SharedValue<boolean>;
  indicatorOutroActive: SharedValue<boolean>;
  refreshCommitRequested: SharedValue<boolean>;
  thresholdHapticSent: SharedValue<boolean>;
  topScrollOffset: SharedValue<number>;
}

export const usePullToRefreshGesture = ({
  state,
  onCancel,
  onCommit,
  onThreshold,
  writeRivePulling,
  writeRiveProgress,
}: UsePullToRefreshGestureOptions): ReturnType<typeof Gesture.Simultaneous> => {
  const gestureState = { ...state };

  // Not wrapped in useMemo: the React Compiler memoizes this gesture, and a
  // manual useMemo could not be preserved because its worklets capture shared
  // values tracked by the compiler.
  const pullGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event, stateManager) => {
      'worklet';
      if (
        !gestureState.riveReady.value ||
        gestureState.refreshing.value ||
        gestureState.refreshLock.value
      ) {
        stateManager.fail();
        return;
      }

      const touch = event.allTouches[0];
      if (
        !touch ||
        gestureState.scrollY.value >
          gestureState.topScrollOffset.value + SCROLL_TOP_THRESHOLD
      ) {
        stateManager.fail();
        return;
      }

      gestureState.gestureType.value = 'pending';
      gestureState.pullingStateSent.value = false;
      gestureState.indicatorOutroActive.value = false;
      gestureState.refreshCommitRequested.value = false;
      gestureState.thresholdHapticSent.value = false;
      gestureState.initialTouchY.value = touch.y;
      gestureState.initialTouchX.value = touch.x;
      gestureState.pullDistance.value = 0;
      gestureState.pullProgress.value = 0;
    })
    .onTouchesMove((event, stateManager) => {
      'worklet';
      if (gestureState.gestureType.value !== 'pending') {
        return;
      }

      const touch = event.allTouches[0];
      if (!touch) {
        gestureState.gestureType.value = null;
        stateManager.fail();
        return;
      }

      const deltaY = touch.y - gestureState.initialTouchY.value;
      const deltaX = Math.abs(touch.x - gestureState.initialTouchX.value);
      if (deltaY > PULL_MOVE_ACTIVATION && deltaY > deltaX) {
        gestureState.gestureType.value = 'active';
        gestureState.pullingStateSent.value = false;
        stateManager.activate();
      } else if (
        deltaX > PULL_MOVE_ACTIVATION ||
        deltaY < -PULL_MOVE_ACTIVATION
      ) {
        gestureState.gestureType.value = null;
        gestureState.pullingStateSent.value = false;
        stateManager.fail();
      }
    })
    .onUpdate((event) => {
      'worklet';
      if (gestureState.gestureType.value !== 'active') {
        return;
      }

      if (event.translationY < 0) {
        gestureState.gestureType.value = null;
        gestureState.pullingStateSent.value = false;
        gestureState.refreshCommitRequested.value = false;
        gestureState.pullDistance.value = withTiming(0, { duration: 200 });
        gestureState.pullProgress.value = withTiming(0, { duration: 200 });
        scheduleOnRN(onCancel);
        return;
      }

      const nextProgress = Math.min(
        Math.max((event.translationY / PULL_REFRESH_THRESHOLD) * 100, 0),
        100,
      );
      gestureState.pullDistance.value = getResistedPullDistance(
        event.translationY,
      );
      gestureState.pullProgress.value = nextProgress;
      if (nextProgress >= 100 && !gestureState.thresholdHapticSent.value) {
        gestureState.thresholdHapticSent.value = true;
        scheduleOnRN(onThreshold);
      }
      if (!gestureState.pullingStateSent.value) {
        gestureState.pullingStateSent.value = true;
        scheduleOnRN(writeRivePulling, true);
      }
      scheduleOnRN(writeRiveProgress, nextProgress);
    })
    .onEnd((event) => {
      'worklet';
      if (gestureState.gestureType.value !== 'active') {
        gestureState.gestureType.value = null;
        gestureState.pullingStateSent.value = false;
        return;
      }

      if (event.translationY >= PULL_REFRESH_THRESHOLD) {
        if (!gestureState.thresholdHapticSent.value) {
          gestureState.thresholdHapticSent.value = true;
          scheduleOnRN(onThreshold);
        }
        gestureState.refreshCommitRequested.value = true;
        gestureState.pullDistance.value = withTiming(PULL_REFRESH_THRESHOLD, {
          duration: 200,
        });
        scheduleOnRN(onCommit);
      } else {
        gestureState.refreshCommitRequested.value = false;
        scheduleOnRN(onCancel);
        gestureState.pullDistance.value = withTiming(0, { duration: 200 });
      }
      gestureState.gestureType.value = null;
      gestureState.pullingStateSent.value = false;
      gestureState.thresholdHapticSent.value = false;
      gestureState.pullProgress.value = withTiming(0, { duration: 200 });
    })
    .onFinalize(() => {
      'worklet';
      gestureState.gestureType.value = null;
      gestureState.pullingStateSent.value = false;
      gestureState.thresholdHapticSent.value = false;
      if (!gestureState.refreshCommitRequested.value) {
        gestureState.pullDistance.value = withTiming(0, { duration: 200 });
      }
      gestureState.pullProgress.value = withTiming(0, { duration: 200 });
    });

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  const combinedGesture = useMemo(
    () => Gesture.Simultaneous(pullGesture, nativeGesture),
    [nativeGesture, pullGesture],
  );

  return combinedGesture;
};
