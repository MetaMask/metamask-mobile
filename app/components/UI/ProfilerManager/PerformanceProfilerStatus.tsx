/**
 * Invisible Appium controls for Hermes CPU profiling on performance-test APKs.
 *
 * Appium taps start/stop Pressables (same pattern as the PoC in #34727). Status
 * hooks expose recording/result readiness, the on-device `.cpuprofile` path, and
 * whether the session was lost because the app process was terminated mid-test.
 * Only mounts when `IS_PERFORMANCE_TEST=true` — no deeplinks (those hit MetaMask's
 * unsupported-link / 404 UI).
 *
 * Touch targets are intentionally large (not 1×1): BrowserStack Appium can find
 * tiny a11y nodes but often fails to deliver `click()` to RN Pressable onPress.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
  subscribeAppProfilingStatus,
  type AppProfilingStatus,
} from '../../../core/Performance/appProfiling';

export const PERFORMANCE_PROFILER_STATUS_TEST_IDS = {
  start: 'performance-profiler-start',
  stop: 'performance-profiler-stop',
  startAck: 'performance-profiler-start-ack',
  stopAck: 'performance-profiler-stop-ack',
  recordingReady: 'performance-profiler-recording-ready',
  resultReady: 'performance-profiler-result-ready',
  sessionLost: 'performance-profiler-session-lost',
  error: 'performance-profiler-error',
} as const;

const styles = StyleSheet.create({
  hook: {
    position: 'absolute',
    width: 48,
    height: 48,
    // Keep visible enough for Appium click delivery on BrowserStack; still
    // effectively invisible to humans.
    opacity: 0.05,
    zIndex: 9999,
    elevation: 9999,
  },
  start: {
    top: 0,
    left: 0,
  },
  stop: {
    top: 0,
    left: 52,
  },
  startAck: {
    top: 52,
    left: 0,
  },
  stopAck: {
    top: 52,
    left: 52,
  },
  recordingReady: {
    top: 104,
    left: 0,
  },
  resultReady: {
    top: 104,
    left: 52,
  },
  sessionLost: {
    top: 156,
    left: 0,
  },
  error: {
    top: 156,
    left: 52,
  },
});

const PerformanceProfilerStatus: React.FC = () => {
  const [status, setStatus] = useState<AppProfilingStatus>({
    isRecording: false,
    isSessionLost: false,
    lastProfilePath: null,
    lastError: null,
  });
  const [startAcked, setStartAcked] = useState(false);
  const [stopAcked, setStopAcked] = useState(false);

  useEffect(() => {
    if (!isPerformanceProfilingEnabled) {
      return undefined;
    }
    return subscribeAppProfilingStatus(setStatus);
  }, []);

  const handleStart = useCallback(() => {
    setStartAcked(true);
    setStopAcked(false);
    startAppProfiling().catch(() => {
      // Errors are published via subscribeAppProfilingStatus (error hook).
    });
  }, []);

  const handleStop = useCallback(() => {
    setStopAcked(true);
    stopAppProfiling().catch(() => {
      // Errors are published via subscribeAppProfilingStatus (error hook).
    });
  }, []);

  if (!isPerformanceProfilingEnabled) {
    return null;
  }

  return (
    <>
      <Pressable
        testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.start}
        accessibilityLabel={PERFORMANCE_PROFILER_STATUS_TEST_IDS.start}
        accessible
        importantForAccessibility="yes"
        collapsable={false}
        onPress={handleStart}
        style={[styles.hook, styles.start]}
      />
      <Pressable
        testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop}
        accessibilityLabel={PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop}
        accessible
        importantForAccessibility="yes"
        collapsable={false}
        onPress={handleStop}
        style={[styles.hook, styles.stop]}
      />
      {startAcked && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.startAck}
          accessibilityLabel={PERFORMANCE_PROFILER_STATUS_TEST_IDS.startAck}
          accessible
          importantForAccessibility="yes"
          collapsable={false}
          onPress={() => undefined}
          style={[styles.hook, styles.startAck]}
        />
      )}
      {stopAcked && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.stopAck}
          accessibilityLabel={PERFORMANCE_PROFILER_STATUS_TEST_IDS.stopAck}
          accessible
          importantForAccessibility="yes"
          collapsable={false}
          onPress={() => undefined}
          style={[styles.hook, styles.stopAck]}
        />
      )}
      {status.isRecording && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady}
          accessibilityLabel={
            PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady
          }
          accessible
          importantForAccessibility="yes"
          collapsable={false}
          onPress={() => undefined}
          style={[styles.hook, styles.recordingReady]}
        />
      )}
      {status.lastProfilePath && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.resultReady}
          accessibilityLabel={`${PERFORMANCE_PROFILER_STATUS_TEST_IDS.resultReady}:${status.lastProfilePath}`}
          accessible
          importantForAccessibility="yes"
          collapsable={false}
          onPress={() => undefined}
          style={[styles.hook, styles.resultReady]}
        />
      )}
      {status.isSessionLost && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.sessionLost}
          accessibilityLabel={PERFORMANCE_PROFILER_STATUS_TEST_IDS.sessionLost}
          accessible
          importantForAccessibility="yes"
          collapsable={false}
          onPress={() => undefined}
          style={[styles.hook, styles.sessionLost]}
        />
      )}
      {status.lastError && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.error}
          accessibilityLabel={`${PERFORMANCE_PROFILER_STATUS_TEST_IDS.error}:${status.lastError}`}
          accessible
          importantForAccessibility="yes"
          collapsable={false}
          onPress={() => undefined}
          style={[styles.hook, styles.error]}
        />
      )}
    </>
  );
};

export default PerformanceProfilerStatus;
