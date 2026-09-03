/**
 * Invisible Appium controls for Hermes CPU profiling on performance-test APKs.
 *
 * Appium taps start/stop Pressables (same pattern as the PoC in #34727). Status
 * hooks expose recording/result readiness and the on-device `.cpuprofile` path.
 * Only mounts when `IS_PERFORMANCE_TEST=true` — no deeplinks (those hit MetaMask's
 * unsupported-link / 404 UI).
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
  recordingReady: 'performance-profiler-recording-ready',
  resultReady: 'performance-profiler-result-ready',
  error: 'performance-profiler-error',
} as const;

const styles = StyleSheet.create({
  hook: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  start: {
    top: 0,
    left: 0,
  },
  stop: {
    top: 2,
    left: 0,
  },
  recordingReady: {
    top: 4,
    left: 0,
  },
  resultReady: {
    top: 6,
    left: 0,
  },
  error: {
    top: 8,
    left: 0,
  },
});

const PerformanceProfilerStatus: React.FC = () => {
  const [status, setStatus] = useState<AppProfilingStatus>({
    isRecording: false,
    lastProfilePath: null,
    lastError: null,
  });

  useEffect(() => {
    if (!isPerformanceProfilingEnabled) {
      return undefined;
    }
    return subscribeAppProfilingStatus(setStatus);
  }, []);

  const handleStart = useCallback(() => {
    startAppProfiling().catch(() => {
      // Errors are published via subscribeAppProfilingStatus (error hook).
    });
  }, []);

  const handleStop = useCallback(() => {
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
        onPress={handleStart}
        style={[styles.hook, styles.start]}
      />
      <Pressable
        testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop}
        accessibilityLabel={PERFORMANCE_PROFILER_STATUS_TEST_IDS.stop}
        accessible
        importantForAccessibility="yes"
        onPress={handleStop}
        style={[styles.hook, styles.stop]}
      />
      {status.isRecording && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady}
          accessibilityLabel={
            PERFORMANCE_PROFILER_STATUS_TEST_IDS.recordingReady
          }
          accessible
          importantForAccessibility="yes"
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
          onPress={() => undefined}
          style={[styles.hook, styles.resultReady]}
        />
      )}
      {status.lastError && (
        <Pressable
          testID={PERFORMANCE_PROFILER_STATUS_TEST_IDS.error}
          accessibilityLabel={`${PERFORMANCE_PROFILER_STATUS_TEST_IDS.error}:${status.lastError}`}
          accessible
          importantForAccessibility="yes"
          onPress={() => undefined}
          style={[styles.hook, styles.error]}
        />
      )}
    </>
  );
};

export default PerformanceProfilerStatus;
