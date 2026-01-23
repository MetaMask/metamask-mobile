import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withTiming,
  runOnJS,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '../../../util/theme';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  EDGE_THRESHOLD,
  SWIPE_THRESHOLD,
  PULL_THRESHOLD,
  SCROLL_TOP_THRESHOLD,
  PULL_ACTIVATION_ZONE,
} from './constants';

const styles = StyleSheet.create({
  refreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9997,
  },
});

export interface GestureWebViewWrapperProps {
  /** Whether the tab is currently active */
  isTabActive: boolean;
  /** Whether the URL bar is focused (disables gestures) */
  isUrlBarFocused: boolean;
  /** Whether the first URL has loaded (enables gestures) */
  firstUrlLoaded: boolean;
  /** Whether back navigation is available */
  backEnabled: boolean;
  /** Whether forward navigation is available */
  forwardEnabled: boolean;
  /** Callback to navigate back */
  onGoBack: () => void;
  /** Callback to navigate forward */
  onGoForward: () => void;
  /** Callback to reload the page */
  onReload: () => void;
  /** Shared value for scroll position from WebView */
  scrollY: SharedValue<number>;
  /** Shared value for isAtTop state */
  isAtTop: SharedValue<boolean>;
  /** Shared value for refresh state - set to false by parent when load completes */
  isRefreshing: SharedValue<boolean>;
  /** Children to wrap (WebView) */
  children: React.ReactNode;
}

/**
 * GestureWebViewWrapper - A wrapper component that provides gesture navigation for WebView
 *
 * This component encapsulates all gesture handling logic for:
 * - Left edge swipe: Navigate back
 * - Right edge swipe: Navigate forward
 * - Pull-to-refresh: Reload page (when scrolled to top)
 *
 * Uses Gesture.Race with manualActivation(true) to coordinate gestures with WebView's
 * native touch handling.
 */
export const GestureWebViewWrapper: React.FC<GestureWebViewWrapperProps> = ({
  isTabActive,
  isUrlBarFocused,
  firstUrlLoaded,
  backEnabled,
  forwardEnabled,
  onGoBack,
  onGoForward,
  onReload,
  scrollY,
  isAtTop,
  isRefreshing,
  children,
}) => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const screenWidth = Dimensions.get('window').width;

  // Gesture state - using shared values to avoid re-renders and stale reads in worklets
  const pullDistanceRef = useRef<number>(0);
  const pullProgress = useSharedValue(0);
  const isPulling = useSharedValue(false);
  const pullHapticTriggered = useSharedValue(false);
  const swipeStartTime = useRef<number>(0);
  const swipeProgress = useSharedValue(0);
  const swipeDirection = useSharedValue<'back' | 'forward' | null>(null);
  const gestureType = useSharedValue<'back' | 'forward' | 'refresh' | null>(
    null,
  );

  // Navigation state as shared values - prevents stale reads in worklets
  // These are synced from props to ensure real-time access in UI thread
  const backEnabledShared = useSharedValue(backEnabled);
  const forwardEnabledShared = useSharedValue(forwardEnabled);

  // Sync navigation state from props to shared values
  useEffect(() => {
    backEnabledShared.value = backEnabled;
  }, [backEnabled, backEnabledShared]);

  useEffect(() => {
    forwardEnabledShared.value = forwardEnabled;
  }, [forwardEnabled, forwardEnabledShared]);

  /**
   * Check if gestures should be enabled
   */
  const areGesturesEnabled = useMemo(
    () => isTabActive && !isUrlBarFocused && firstUrlLoaded,
    [isTabActive, isUrlBarFocused, firstUrlLoaded],
  );

  /**
   * Trigger haptic feedback
   */
  const triggerHapticFeedback = useCallback((style: ImpactFeedbackStyle) => {
    impactAsync(style);
  }, []);

  // Note: resetSwipeAnimation and resetPullAnimation are inlined directly in worklets
  // since they only update shared values, which can be done on the UI thread

  /**
   * Handle swipe navigation gesture completion
   */
  const handleSwipeNavigation = useCallback(
    (direction: 'back' | 'forward', distance: number, duration: number) => {
      if (direction === 'back' && backEnabled) {
        onGoBack();
        trackEvent(
          createEventBuilder(MetaMetricsEvents.BROWSER_SWIPE_BACK)
            .addProperties({
              swipe_distance: distance,
              swipe_duration: duration,
            })
            .build(),
        );
        triggerHapticFeedback(ImpactFeedbackStyle.Medium);
      } else if (direction === 'forward' && forwardEnabled) {
        onGoForward();
        trackEvent(
          createEventBuilder(MetaMetricsEvents.BROWSER_SWIPE_FORWARD)
            .addProperties({
              swipe_distance: distance,
              swipe_duration: duration,
            })
            .build(),
        );
        triggerHapticFeedback(ImpactFeedbackStyle.Medium);
      }
    },
    [
      backEnabled,
      forwardEnabled,
      onGoBack,
      onGoForward,
      trackEvent,
      createEventBuilder,
      triggerHapticFeedback,
    ],
  );

  /**
   * Handle pull-to-refresh completion
   */
  const handleRefresh = useCallback(() => {
    if (isRefreshing.value) return;

    isRefreshing.value = true;
    onReload();
    impactAsync(ImpactFeedbackStyle.Medium);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_PULL_REFRESH)
        .addProperties({ pull_distance: pullDistanceRef.current })
        .build(),
    );
  }, [isRefreshing, onReload, trackEvent, createEventBuilder]);

  /**
   * Native gesture for WebView - represents WebView's internal scrolling
   */
  const webViewNativeGesture = useMemo(() => Gesture.Native(), []);

  /**
   * Unified gesture using manualActivation
   *
   * Uses manualActivation(true) to manually control when the gesture activates
   * based on touch position. This allows us to:
   * 1. Check touch position in onTouchesDown
   * 2. Activate ONLY for edge swipes or pull-to-refresh zones
   * 3. Fail for other touches, letting WebView handle them
   */
  const fullyUnifiedGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((event, stateManager) => {
          'worklet';
          if (!areGesturesEnabled) {
            stateManager.fail();
            return;
          }

          const touch = event.allTouches[0];
          if (!touch) {
            stateManager.fail();
            return;
          }

          const { x, y } = touch;
          const rightEdgeStart = screenWidth - EDGE_THRESHOLD;

          // Check if touch is in a gesture zone
          // Use shared values for navigation state to avoid stale reads in worklets
          const isLeftEdge = x < EDGE_THRESHOLD && backEnabledShared.value;
          const isRightEdge = x > rightEdgeStart && forwardEnabledShared.value;
          const currentlyAtTop = scrollY.value <= SCROLL_TOP_THRESHOLD;
          const isInPullZone = y < PULL_ACTIVATION_ZONE;
          const canPullToRefresh =
            currentlyAtTop && !isRefreshing.value && isInPullZone;

          if (isLeftEdge) {
            gestureType.value = 'back';
            swipeDirection.value = 'back';
            swipeProgress.value = 0;
            swipeStartTime.current = Date.now();
            stateManager.activate();
            runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
          } else if (isRightEdge) {
            gestureType.value = 'forward';
            swipeDirection.value = 'forward';
            swipeProgress.value = 0;
            swipeStartTime.current = Date.now();
            stateManager.activate();
            runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
          } else if (canPullToRefresh) {
            gestureType.value = 'refresh';
            isPulling.value = true;
            pullProgress.value = 0;
            pullHapticTriggered.value = false;
            stateManager.activate();
          } else {
            stateManager.fail();
          }
        })
        .onUpdate((event) => {
          'worklet';
          const currentGestureType = gestureType.value;
          if (!currentGestureType) return;

          const swipeDistance = screenWidth * SWIPE_THRESHOLD;

          if (currentGestureType === 'back' && event.translationX > 0) {
            swipeProgress.value = Math.min(
              event.translationX / swipeDistance,
              1,
            );
          } else if (
            currentGestureType === 'forward' &&
            event.translationX < 0
          ) {
            swipeProgress.value = Math.min(
              Math.abs(event.translationX) / swipeDistance,
              1,
            );
          } else if (currentGestureType === 'refresh') {
            if (event.translationY < 0) {
              // Cancel refresh - upward movement, reset directly on UI thread
              gestureType.value = null;
              isPulling.value = false;
              pullProgress.value = withTiming(0, { duration: 200 });
              pullHapticTriggered.value = false;
              return;
            }

            if (!pullHapticTriggered.value && event.translationY > 10) {
              pullHapticTriggered.value = true;
              runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
            }

            pullProgress.value = Math.min(
              event.translationY / PULL_THRESHOLD,
              1.5,
            );
          }
        })
        .onEnd((event) => {
          'worklet';
          const currentGestureType = gestureType.value;
          if (!currentGestureType) {
            // Reset animations directly on UI thread
            swipeProgress.value = withTiming(0, { duration: 200 });
            swipeDirection.value = null;
            pullProgress.value = withTiming(0, { duration: 200 });
            isPulling.value = false;
            return;
          }

          const swipeDistance = screenWidth * SWIPE_THRESHOLD;
          const duration = Date.now() - swipeStartTime.current;

          if (currentGestureType === 'back') {
            if (event.translationX >= swipeDistance) {
              // Only runOnJS for callbacks that need JS thread (navigation, analytics)
              runOnJS(handleSwipeNavigation)(
                'back',
                event.translationX,
                duration,
              );
            }
            // Reset swipe animation directly on UI thread
            swipeProgress.value = withTiming(0, { duration: 200 });
            swipeDirection.value = null;
          } else if (currentGestureType === 'forward') {
            if (event.translationX <= -swipeDistance) {
              runOnJS(handleSwipeNavigation)(
                'forward',
                Math.abs(event.translationX),
                duration,
              );
            }
            swipeProgress.value = withTiming(0, { duration: 200 });
            swipeDirection.value = null;
          } else if (currentGestureType === 'refresh') {
            if (event.translationY >= PULL_THRESHOLD) {
              pullDistanceRef.current = event.translationY;
              runOnJS(handleRefresh)();
            }
            // Reset pull animation directly on UI thread
            pullProgress.value = withTiming(0, { duration: 200 });
            isPulling.value = false;
          }

          gestureType.value = null;
        })
        .onFinalize(() => {
          'worklet';
          // Reset all gesture state directly on UI thread
          gestureType.value = null;
          isPulling.value = false;
          pullHapticTriggered.value = false;
          // Reset animations
          swipeProgress.value = withTiming(0, { duration: 200 });
          swipeDirection.value = null;
          pullProgress.value = withTiming(0, { duration: 200 });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      areGesturesEnabled,
      screenWidth,
      triggerHapticFeedback,
      handleSwipeNavigation,
      handleRefresh,
      // Note: backEnabledShared and forwardEnabledShared are stable refs
      // Their values are synced via useEffect, so they don't need to be deps
    ],
  );

  /**
   * Combined gesture - uses Race so our gesture takes priority when activated
   */
  const combinedWebViewGesture = useMemo(
    () => Gesture.Race(fullyUnifiedGesture, webViewNativeGesture),
    [webViewNativeGesture, fullyUnifiedGesture],
  );

  /**
   * Animated style for refresh indicator
   */
  const refreshIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pullProgress.value * PULL_THRESHOLD - PULL_THRESHOLD },
    ],
    opacity: isAtTop.value ? pullProgress.value : 0,
    display: isAtTop.value ? 'flex' : 'none',
  }));

  // Expose onLoadComplete via a React context or imperative handle if needed
  // For now, we'll handle this through the parent component

  return (
    <>
      {/* Refresh indicator */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.refreshIndicator,
          // eslint-disable-next-line react-native/no-inline-styles
          { height: PULL_THRESHOLD },
          refreshIndicatorStyle,
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary.default} />
      </Animated.View>

      {/* Gesture detector wrapping children */}
      <GestureDetector gesture={combinedWebViewGesture}>
        {children}
      </GestureDetector>
    </>
  );
};

export default GestureWebViewWrapper;
