import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../util/deviceCapability';
import { fireImpact, ImpactMoment } from '../../../util/haptics';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';
import PullToRefreshIndicator from './PullToRefreshIndicator';
import { PullToRefreshTestIds } from './PullToRefresh.testIds';
import type {
  PullToRefreshProps,
  PullToRefreshScrollProps,
} from './PullToRefresh.types';
import {
  PULL_REFRESH_OUTRO_SPRING,
  PULL_REFRESH_THRESHOLD,
  REFRESH_OUTRO_DURATION_MS,
  REFRESH_OUTRO_LEAD_IN_DURATION_MS,
} from './pullToRefreshConstants';
import {
  type PullToRefreshGestureState,
  usePullToRefreshGesture,
} from './usePullToRefreshGesture';
import { usePullToRefreshRive } from './usePullToRefreshRive';

/**
 * Container-agnostic pull-to-refresh primitive that drives the Fox Rive
 * animation and falls back to the native `RefreshControl` when Rive is
 * inactive, disabled by device/network/accessibility constraints, or fails.
 */
const PullToRefresh = ({
  children,
  refreshing,
  onRefresh,
  indicatorTopInset = 0,
  refreshControlTopInset = indicatorTopInset,
  indicatorBottomInset = 0,
  scrollY: externalScrollY,
  topScrollOffset = 0,
  isActive = true,
  onScroll,
  bounces,
  overScrollMode,
  accessibilityActions: callerAccessibilityActions,
  accessibilityState: callerAccessibilityState,
  onAccessibilityAction: callerOnAccessibilityAction,
  refreshingAnnouncement,
  updatedAnnouncement,
}: PullToRefreshProps): React.JSX.Element => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const networkTier = useNetworkTier();
  const prefersReducedMotion = useReducedMotion();
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  const shouldUseRive =
    isActive &&
    !prefersReducedMotion &&
    !screenReaderEnabled &&
    networkTier !== 'NONE' &&
    !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

  const previousRefreshingRef = useRef(refreshing);
  const refreshAnnouncementStateRef = useRef<'idle' | 'refreshing'>(
    refreshing ? 'refreshing' : 'idle',
  );
  const screenReaderEnabledRef = useRef(false);
  const pullRefreshCommittedRef = useRef(false);
  const outroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTopScrollOffsetRef = useRef(topScrollOffset);

  const internalScrollY = useSharedValue(topScrollOffset);
  const topScrollOffsetShared = useSharedValue(topScrollOffset);
  const activeScrollY = externalScrollY ?? internalScrollY;
  const pullDistance = useSharedValue(0);
  const pullProgress = useSharedValue(0);
  const initialTouchY = useSharedValue(0);
  const initialTouchX = useSharedValue(0);
  const gestureType = useSharedValue<'pending' | 'active' | null>(null);
  const pullingStateSent = useSharedValue(false);
  const refreshingShared = useSharedValue(refreshing);
  const refreshLock = useSharedValue(false);
  const indicatorOutroActive = useSharedValue(false);
  const refreshCommitRequested = useSharedValue(false);
  const thresholdHapticSent = useSharedValue(false);

  useEffect(() => {
    topScrollOffsetShared.value = topScrollOffset;

    if (
      !externalScrollY &&
      internalScrollY.value === previousTopScrollOffsetRef.current
    ) {
      internalScrollY.value = topScrollOffset;
    }
    previousTopScrollOffsetRef.current = topScrollOffset;
  }, [
    externalScrollY,
    internalScrollY,
    previousTopScrollOffsetRef,
    topScrollOffset,
    topScrollOffsetShared,
  ]);

  const {
    canRenderRive,
    bindingReady,
    instance,
    riveFile,
    riveReadyShared,
    riveViewRef,
    setHybridRef,
    handleRiveError,
    writeRivePulling,
    writeRiveProgress,
    writeRiveRefreshing,
  } = usePullToRefreshRive({
    enabled: shouldUseRive,
    pullDistance,
  });

  useEffect(() => {
    let isMounted = true;
    const handleScreenReaderChange = (enabled: boolean): void => {
      if (isMounted && screenReaderEnabledRef.current !== enabled) {
        screenReaderEnabledRef.current = enabled;
        setScreenReaderEnabled(enabled);
      }
    };

    AccessibilityInfo.isScreenReaderEnabled()
      .then(handleScreenReaderChange)
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      handleScreenReaderChange,
    );

    return (): void => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const announceRefreshStart = useCallback(() => {
    if (refreshAnnouncementStateRef.current === 'refreshing') {
      return;
    }

    refreshAnnouncementStateRef.current = 'refreshing';
    AccessibilityInfo.announceForAccessibility(
      refreshingAnnouncement ?? strings('common.refreshing'),
    );
  }, [refreshingAnnouncement]);

  const announceRefreshComplete = useCallback(() => {
    if (refreshAnnouncementStateRef.current === 'idle') {
      return;
    }

    refreshAnnouncementStateRef.current = 'idle';
    AccessibilityInfo.announceForAccessibility(
      updatedAnnouncement ?? strings('common.updated'),
    );
  }, [updatedAnnouncement]);

  const cancelOutroTimer = useCallback(() => {
    if (outroTimerRef.current) {
      clearTimeout(outroTimerRef.current);
      outroTimerRef.current = null;
    }
  }, []);

  const startOutroLock = useCallback(() => {
    refreshLock.value = true;
    indicatorOutroActive.value = true;
    refreshCommitRequested.value = false;
    cancelOutroTimer();
    outroTimerRef.current = setTimeout(() => {
      pullDistance.value = withSpring(0, PULL_REFRESH_OUTRO_SPRING);
      outroTimerRef.current = setTimeout(() => {
        refreshLock.value = false;
        indicatorOutroActive.value = false;
        pullDistance.value = 0;
        outroTimerRef.current = null;
      }, REFRESH_OUTRO_DURATION_MS);
    }, REFRESH_OUTRO_LEAD_IN_DURATION_MS);
  }, [
    cancelOutroTimer,
    indicatorOutroActive,
    pullDistance,
    refreshCommitRequested,
    refreshLock,
  ]);

  useEffect(() => cancelOutroTimer, [cancelOutroTimer]);

  const resetRivePull = useCallback(() => {
    writeRivePulling(false);
    writeRiveProgress(0);
  }, [writeRiveProgress, writeRivePulling]);

  const completeFailedRefresh = useCallback(() => {
    refreshingShared.value = false;
    writeRiveRefreshing(false);
    writeRiveProgress(0);
    announceRefreshComplete();
    startOutroLock();
  }, [
    announceRefreshComplete,
    refreshingShared,
    startOutroLock,
    writeRiveProgress,
    writeRiveRefreshing,
  ]);

  const commitRefresh = useCallback(() => {
    if (refreshingShared.value || refreshLock.value) {
      return;
    }

    refreshingShared.value = true;
    pullRefreshCommittedRef.current = true;
    pullDistance.value = withTiming(PULL_REFRESH_THRESHOLD, {
      duration: 200,
    });
    writeRiveRefreshing(true);
    writeRivePulling(false);
    announceRefreshStart();
    fireImpact(ImpactMoment.PullToRefresh);

    try {
      const refreshResult = onRefresh();
      if (refreshResult && typeof refreshResult.then === 'function') {
        refreshResult.catch(completeFailedRefresh);
      }
    } catch (error) {
      Logger.error(error as Error, 'PullToRefresh: refresh failed to start');
      completeFailedRefresh();
    }
  }, [
    completeFailedRefresh,
    onRefresh,
    pullDistance,
    refreshLock,
    refreshingShared,
    announceRefreshStart,
    writeRivePulling,
    writeRiveRefreshing,
  ]);

  useEffect(() => {
    refreshingShared.value = refreshing;
    const wasRefreshing = previousRefreshingRef.current;
    previousRefreshingRef.current = refreshing;

    if (refreshing && !wasRefreshing) {
      announceRefreshStart();
    } else if (!refreshing && wasRefreshing) {
      announceRefreshComplete();
    }

    if (!riveViewRef) {
      return;
    }

    if (refreshing) {
      cancelOutroTimer();
      refreshLock.value = false;
      indicatorOutroActive.value = false;
      refreshCommitRequested.value = false;
      pullDistance.value = withTiming(PULL_REFRESH_THRESHOLD, {
        duration: 200,
      });
      writeRivePulling(false);
      writeRiveRefreshing(true);
      if (!pullRefreshCommittedRef.current) {
        writeRiveProgress(0);
      }
      pullRefreshCommittedRef.current = false;
    } else if (wasRefreshing) {
      writeRiveRefreshing(false);
      writeRiveProgress(0);
      startOutroLock();
    }
  }, [
    refreshing,
    announceRefreshComplete,
    announceRefreshStart,
    cancelOutroTimer,
    indicatorOutroActive,
    pullDistance,
    refreshCommitRequested,
    refreshingShared,
    riveViewRef,
    refreshLock,
    startOutroLock,
    writeRiveProgress,
    writeRivePulling,
    writeRiveRefreshing,
  ]);

  const cancelPull = useCallback(() => {
    resetRivePull();
  }, [resetRivePull]);

  const triggerThresholdHaptic = useCallback(() => {
    fireImpact(ImpactMoment.PullToRefreshEngage);
  }, []);

  const gestureState: PullToRefreshGestureState = {
    scrollY: activeScrollY,
    pullDistance,
    pullProgress,
    initialTouchY,
    initialTouchX,
    gestureType,
    pullingStateSent,
    riveReady: riveReadyShared,
    refreshing: refreshingShared,
    refreshLock,
    indicatorOutroActive,
    refreshCommitRequested,
    thresholdHapticSent,
    topScrollOffset: topScrollOffsetShared,
  };

  const combinedGesture = usePullToRefreshGesture({
    state: gestureState,
    onCancel: cancelPull,
    onCommit: commitRefresh,
    onThreshold: triggerThresholdHaptic,
    writeRivePulling,
    writeRiveProgress,
  });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      internalScrollY.value = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [internalScrollY, onScroll],
  );

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: Math.max(pullDistance.value, 0),
      },
    ],
  }));

  const useCustomGesture = canRenderRive && bindingReady;
  const accessibilityActions = useMemo(() => {
    if (!useCustomGesture) {
      return callerAccessibilityActions;
    }

    const actions = callerAccessibilityActions ?? [];
    if (actions.some(({ name }) => name === 'activate')) {
      return actions;
    }

    return [...actions, { name: 'activate' }];
  }, [callerAccessibilityActions, useCustomGesture]);

  const accessibilityState = useCustomGesture
    ? { ...callerAccessibilityState, busy: refreshing }
    : callerAccessibilityState;

  const handleAccessibilityAction = useCallback(
    (
      event: Parameters<
        NonNullable<ScrollViewProps['onAccessibilityAction']>
      >[0],
    ) => {
      callerOnAccessibilityAction?.(event);
      if (useCustomGesture && event.nativeEvent.actionName === 'activate') {
        commitRefresh();
      }
    },
    [callerOnAccessibilityAction, commitRefresh, useCustomGesture],
  );

  const fallbackRefreshControl = useCustomGesture ? undefined : (
    <RefreshControl
      progressViewOffset={refreshControlTopInset}
      refreshing={refreshing}
      onRefresh={() => {
        Promise.resolve()
          .then(async () => onRefresh())
          .then(announceRefreshComplete)
          .catch(announceRefreshComplete);
        announceRefreshStart();
      }}
      tintColor={colors.icon.default}
      colors={[colors.primary.default]}
      testID={PullToRefreshTestIds.FALLBACK}
    />
  );

  const scrollProps: PullToRefreshScrollProps = {
    ...(externalScrollY ? {} : { onScroll: handleScroll }),
    bounces: useCustomGesture ? false : bounces,
    overScrollMode: useCustomGesture ? 'never' : overScrollMode,
    accessibilityActions,
    accessibilityState,
    onAccessibilityAction: handleAccessibilityAction,
  };

  return (
    <Animated.View style={tw.style('flex-1')}>
      <Animated.View style={[tw.style('flex-1'), contentAnimatedStyle]}>
        <GestureDetector gesture={combinedGesture}>
          {children({
            scrollProps,
            refreshControl: fallbackRefreshControl,
            isCustomGestureActive: useCustomGesture,
          })}
        </GestureDetector>
      </Animated.View>
      {canRenderRive && riveFile && instance ? (
        <PullToRefreshIndicator
          riveFile={riveFile}
          instance={instance}
          setHybridRef={setHybridRef}
          onError={handleRiveError}
          pullDistance={pullDistance}
          pullProgress={pullProgress}
          refreshingShared={refreshingShared}
          indicatorOutroActive={indicatorOutroActive}
          refreshCommitRequested={refreshCommitRequested}
          indicatorTopInset={indicatorTopInset}
          indicatorBottomInset={indicatorBottomInset}
        />
      ) : null}
    </Animated.View>
  );
};

PullToRefresh.displayName = 'PullToRefresh';

export default PullToRefresh;
