/**
 * Invisible Appium hooks that mirror {@link startAppProfiling} / {@link stopAppProfiling}
 * state so performance tests can wait for recording/result readiness and learn the
 * on-device `.cpuprofile` path without shake UI.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  isPerformanceProfilingEnabled,
  subscribeAppProfilingStatus,
  type AppProfilingStatus,
} from '../../../core/Performance/appProfiling';

export const PERFORMANCE_PROFILER_STATUS_TEST_IDS = {
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

  if (!isPerformanceProfilingEnabled) {
    return null;
  }

  return (
    <>
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
