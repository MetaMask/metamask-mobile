import React, { useState, useCallback } from 'react';
import { Platform, Pressable, Share, StyleSheet } from 'react-native';
import { getBundleId, getVersion } from 'react-native-device-info';
import ShakeDetector from './ShakeDetector';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  dumpProfiling,
  startProfiling,
  stopProfiling,
} from 'react-native-release-profiler';
import RNFS from 'react-native-fs';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

const shouldEnableProfiler = (() => {
  switch (process.env.METAMASK_ENVIRONMENT) {
    case 'rc':
      return true;
    case 'exp':
      return true;
    case 'e2e':
      return true;
    default:
      return false;
  }
})();

const styles = StyleSheet.create({
  e2eToggle: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  e2eStart: {
    top: 0,
    left: 0,
  },
  e2eStop: {
    top: 2,
    left: 0,
  },
  e2eRecordingReady: {
    top: 4,
    left: 0,
  },
  e2eResultReady: {
    top: 6,
    left: 0,
  },
  e2eProfilerError: {
    top: 8,
    left: 0,
  },
});

interface ProfilerManagerProps {
  enabled?: boolean;
}
const ProfilerManager: React.FC<ProfilerManagerProps> = ({
  enabled = shouldEnableProfiler,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastProfilePath, setLastProfilePath] = useState<string | null>(null);
  const [profilerError, setProfilerError] = useState<string | null>(null);
  const appId = getBundleId();
  const tw = useTailwind();
  const showE2EControls =
    enabled &&
    ['e2e', 'rc', 'exp'].includes(process.env.METAMASK_ENVIRONMENT ?? '');

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
      if (process.env.METAMASK_ENVIRONMENT === 'e2e') {
        setProfilerError(`startProfiling failed: ${String(error)}`);
      }
    }
  }, [appId]);

  const stopProfiler = useCallback(async () => {
    if (!sessionId) {
      if (process.env.METAMASK_ENVIRONMENT === 'e2e') {
        setProfilerError('stopProfiling skipped: no active profiling session');
      }
      return;
    }

    try {
      const path =
        Platform.OS === 'android' && process.env.METAMASK_ENVIRONMENT === 'e2e'
          ? await dumpProfiling()
          : await stopProfiling(Platform.OS === 'android');
      // Nested ifs (rather than a single `&&` expression) avoid a "value block
      // inside try/catch", which the React Compiler cannot yet optimize.
      if (typeof path === 'string') {
        if (path.length > 0) {
          if (
            Platform.OS === 'ios' &&
            process.env.METAMASK_ENVIRONMENT === 'e2e'
          ) {
            const fileName = path.split('/').pop() || 'profile.cpuprofile';
            await RNFS.copyFile(
              path,
              `${RNFS.DocumentDirectoryPath}/${fileName}`,
            );
          }
          setLastProfilePath(path);
        }
      }
    } catch (error) {
      if (process.env.METAMASK_ENVIRONMENT === 'e2e') {
        setProfilerError(`stopProfiling failed: ${String(error)}`);
      }
    }
    setIsRecording(false);
    setSessionId(null);
  }, [sessionId]);

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
      {showE2EControls && (
        <>
          <Pressable
            testID="e2e-profiler-toggle"
            accessibilityLabel="e2e-profiler-toggle"
            accessible
            importantForAccessibility="yes"
            onPress={handleShake}
            style={styles.e2eToggle}
          />
          <Pressable
            testID="e2e-profiler-start"
            accessibilityLabel="e2e-profiler-start"
            accessible
            importantForAccessibility="yes"
            onPress={startProfiler}
            style={[styles.e2eToggle, styles.e2eStart]}
          />
          <Pressable
            testID="e2e-profiler-stop"
            accessibilityLabel="e2e-profiler-stop"
            accessible
            importantForAccessibility="yes"
            onPress={stopProfiler}
            style={[styles.e2eToggle, styles.e2eStop]}
          />
          {isRecording && (
            <Pressable
              testID="e2e-profiler-recording-ready"
              accessibilityLabel="e2e-profiler-recording-ready"
              accessible
              importantForAccessibility="yes"
              onPress={() => undefined}
              style={[styles.e2eToggle, styles.e2eRecordingReady]}
            />
          )}
          {lastProfilePath && (
            <Pressable
              testID="e2e-profiler-result-ready"
              accessibilityLabel={`e2e-profiler-result-ready:${lastProfilePath}`}
              accessible
              importantForAccessibility="yes"
              onPress={() => undefined}
              style={[styles.e2eToggle, styles.e2eResultReady]}
            />
          )}
          {profilerError && (
            <Pressable
              testID="e2e-profiler-error"
              accessibilityLabel={`e2e-profiler-error:${profilerError}`}
              accessible
              importantForAccessibility="yes"
              onPress={() => undefined}
              style={[styles.e2eToggle, styles.e2eProfilerError]}
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
