import React, { useState, useCallback } from 'react';
import { Platform, Pressable, Share, StyleSheet } from 'react-native';
import { getBundleId, getVersion } from 'react-native-device-info';
import ShakeDetector from './ShakeDetector';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';
import RNFS from 'react-native-fs';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

/**
 * Performance BrowserStack APKs bake `IS_PERFORMANCE_TEST=true` (see builds.yml
 * `main-e2e-bs-*`). Regular smoke e2e APKs do not — keep profiling hooks out of
 * those builds per platform guidance.
 */
export const isPerformanceTestBuild =
  process.env.IS_PERFORMANCE_TEST === 'true';

const shouldEnableProfiler = (() => {
  if (isPerformanceTestBuild) {
    return true;
  }

  switch (process.env.METAMASK_ENVIRONMENT) {
    case 'rc':
      return true;
    case 'exp':
      return true;
    default:
      return false;
  }
})();

const styles = StyleSheet.create({
  performanceControl: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  performanceStart: {
    top: 0,
    left: 0,
  },
  performanceStop: {
    top: 2,
    left: 0,
  },
  performanceRecordingReady: {
    top: 4,
    left: 0,
  },
  performanceResultReady: {
    top: 6,
    left: 0,
  },
  performanceProfilerError: {
    top: 8,
    left: 0,
  },
});

export const PERFORMANCE_PROFILER_TEST_IDS = {
  start: 'performance-profiler-start',
  stop: 'performance-profiler-stop',
  recordingReady: 'performance-profiler-recording-ready',
  resultReady: 'performance-profiler-result-ready',
  error: 'performance-profiler-error',
} as const;

interface ProfilerManagerProps {
  enabled?: boolean;
  /**
   * Mounts invisible Appium start/stop hooks. Defaults to true only on
   * `IS_PERFORMANCE_TEST` APKs so smoke e2e / production builds stay clean.
   */
  performanceTestControls?: boolean;
}
const ProfilerManager: React.FC<ProfilerManagerProps> = ({
  enabled = shouldEnableProfiler,
  performanceTestControls = isPerformanceTestBuild,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastProfilePath, setLastProfilePath] = useState<string | null>(null);
  const [profilerError, setProfilerError] = useState<string | null>(null);
  const appId = getBundleId();
  const tw = useTailwind();
  const showPerformanceTestControls = enabled && performanceTestControls;

  const handleShake = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const startProfiler = useCallback(async () => {
    setProfilerError(null);
    try {
      const appVersion = getVersion();
      const timestamp = Date.now();
      const newSessionId = `${appId}_v${appVersion}_${timestamp}`;

      await startProfiling();
      setIsRecording(true);
      setSessionId(newSessionId);
    } catch (error) {
      if (performanceTestControls) {
        setProfilerError(`startProfiling failed: ${String(error)}`);
      }
    }
  }, [appId, performanceTestControls]);

  const stopProfiler = useCallback(async () => {
    if (!sessionId) {
      if (performanceTestControls) {
        setProfilerError('stopProfiling skipped: no active profiling session');
      }
      return;
    }

    try {
      // `true` copies the .cpuprofile into Android Downloads for later pull.
      const path = await stopProfiling(true);
      // Nested ifs (rather than a single `&&` expression) avoid a "value block
      // inside try/catch", which the React Compiler cannot yet optimize.
      if (typeof path === 'string') {
        if (path.length > 0) {
          setLastProfilePath(path);
        }
      }
    } catch (error) {
      if (performanceTestControls) {
        setProfilerError(`stopProfiling failed: ${String(error)}`);
      }
    }
    setIsRecording(false);
    setSessionId(null);
  }, [sessionId, performanceTestControls]);

  // For iOS only. We can find the file in the Downloads folder on Android.
  const exportTrace = useCallback(async () => {
    if (!lastProfilePath) return;
    try {
      const exists = await RNFS.exists(lastProfilePath);
      if (!exists) return;

      const appVersion = getVersion();
      const timestamp = Date.now();
      const fileName = `${appId}_v${appVersion}_${timestamp}.cpuprofile`;
      const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.copyFile(lastProfilePath, destPath);

      await Share.share({ url: `file://${destPath}` });
    } catch (e) {
      // fail silently
    }
  }, [lastProfilePath, appId]);

  const toggleProfiling = useCallback(() => {
    if (isRecording) {
      stopProfiler();
    } else {
      startProfiler();
    }
  }, [isRecording, startProfiler, stopProfiler]);

  const hideProfiler = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <ShakeDetector onShake={handleShake} sensibility={3} />
      {showPerformanceTestControls && (
        <>
          <Pressable
            testID={PERFORMANCE_PROFILER_TEST_IDS.start}
            accessibilityLabel={PERFORMANCE_PROFILER_TEST_IDS.start}
            accessible
            importantForAccessibility="yes"
            onPress={startProfiler}
            style={[styles.performanceControl, styles.performanceStart]}
          />
          <Pressable
            testID={PERFORMANCE_PROFILER_TEST_IDS.stop}
            accessibilityLabel={PERFORMANCE_PROFILER_TEST_IDS.stop}
            accessible
            importantForAccessibility="yes"
            onPress={stopProfiler}
            style={[styles.performanceControl, styles.performanceStop]}
          />
          {isRecording && (
            <Pressable
              testID={PERFORMANCE_PROFILER_TEST_IDS.recordingReady}
              accessibilityLabel={PERFORMANCE_PROFILER_TEST_IDS.recordingReady}
              accessible
              importantForAccessibility="yes"
              onPress={() => undefined}
              style={[
                styles.performanceControl,
                styles.performanceRecordingReady,
              ]}
            />
          )}
          {lastProfilePath && (
            <Pressable
              testID={PERFORMANCE_PROFILER_TEST_IDS.resultReady}
              accessibilityLabel={`${PERFORMANCE_PROFILER_TEST_IDS.resultReady}:${lastProfilePath}`}
              accessible
              importantForAccessibility="yes"
              onPress={() => undefined}
              style={[
                styles.performanceControl,
                styles.performanceResultReady,
              ]}
            />
          )}
          {profilerError && (
            <Pressable
              testID={PERFORMANCE_PROFILER_TEST_IDS.error}
              accessibilityLabel={`${PERFORMANCE_PROFILER_TEST_IDS.error}:${profilerError}`}
              accessible
              importantForAccessibility="yes"
              onPress={() => undefined}
              style={[
                styles.performanceControl,
                styles.performanceProfilerError,
              ]}
            />
          )}
        </>
      )}
      {isVisible && (
        <Box twClassName="absolute top-20 right-4 z-50 shadow-lg min-w-48">
          <Box twClassName="bg-default rounded-xl p-3 border border-muted">
            <Box twClassName="flex-row p-2 mb-3 justify-between">
              <Text variant={TextVariant.BodyXs}>Performance Profiler</Text>
              <ButtonIcon
                iconName={IconName.Close}
                iconColor={IconColor.Default}
                onPress={hideProfiler}
                testID="close-profiler-button"
              />
            </Box>

            <Box twClassName="flex-row items-center mb-3">
              <Box
                twClassName={`w-2 h-2 rounded-full mr-2 ${
                  isRecording ? 'bg-error-default' : 'bg-primary-default'
                }`}
              />
              <Text variant={TextVariant.BodyXs}>
                {isRecording ? 'Recording...' : 'Stopped'}
              </Text>
            </Box>
            <Box twClassName="mb-3 bg-muted rounded-md p-2">
              <Text variant={TextVariant.BodyXs}>
                Build Type: {process.env.METAMASK_BUILD_TYPE || 'undefined'}
              </Text>
              <Text variant={TextVariant.BodyXs}>
                Environment: {process.env.METAMASK_ENVIRONMENT || 'undefined'}
              </Text>
            </Box>
            <Box twClassName="flex-row gap-2 mb-3">
              <Pressable
                style={tw.style(
                  'flex-1 p-2 rounded-md items-center justify-center',
                  isRecording ? 'bg-error-default' : 'bg-primary-default',
                )}
                onPress={toggleProfiling}
                testID={
                  isRecording ? 'profiler-stop-button' : 'profiler-start-button'
                }
              >
                <Text twClassName="text-white" variant={TextVariant.BodySm}>
                  {isRecording ? 'Stop' : 'Start'}
                </Text>
              </Pressable>
              {Platform.OS === 'ios' && (
                <Pressable
                  disabled={isRecording || !lastProfilePath}
                  style={({ pressed }) =>
                    tw.style(
                      'flex-1 p-2 rounded-md items-center justify-center',
                      isRecording || !lastProfilePath
                        ? 'bg-muted'
                        : pressed
                          ? 'bg-pressed'
                          : 'bg-primary-default',
                    )
                  }
                  onPress={exportTrace}
                >
                  <Text
                    twClassName={
                      isRecording || !lastProfilePath
                        ? 'text-muted'
                        : 'text-white'
                    }
                    variant={TextVariant.BodySm}
                  >
                    Export
                  </Text>
                </Pressable>
              )}
            </Box>

            <Box twClassName="pt-3 border-t border-muted max-w-48">
              <Text variant={TextVariant.BodyXs} twClassName="text-center">
                Shake device to toggle this menu.{' '}
                {Platform.OS === 'android' &&
                  'You can find the profiling file in the Android Downloads folder.'}
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ProfilerManager;
