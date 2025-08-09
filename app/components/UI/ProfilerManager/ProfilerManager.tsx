import React, { useState, useCallback } from 'react';
import { Pressable } from 'react-native';
import { getBundleId, getVersion } from 'react-native-device-info';
import ShakeDetector from './ShakeDetector';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';

interface ProfilerManagerProps {
  enabled?: boolean;
}

const ProfilerManager: React.FC<ProfilerManagerProps> = ({
  enabled = process.env.METAMASK_ENVIRONMENT === 'rc',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const appId = getBundleId();
  const tw = useTailwind();

  const handleShake = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const startProfiler = useCallback(async () => {
    try {
      const appVersion = getVersion();
      const timestamp = Date.now();
      const newSessionId = `${appId}_v${appVersion}_${timestamp}`;

      await startProfiling();
      setIsRecording(true);
      setSessionId(newSessionId);
    } catch (error) {
      // fail silently
    }
  }, [appId]);

  const stopProfiler = useCallback(async () => {
    if (!sessionId) return;

    try {
      await stopProfiling(true);
    } catch (error) {
      // fail silently
    }
    setIsRecording(false);
    setSessionId(null);
  }, [sessionId]);

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
      {isVisible && (
        <Box twClassName="absolute top-20 right-4 z-50 shadow-lg min-w-48">
          <Box twClassName="bg-default rounded-xl p-3 border border-muted">
            <Box twClassName="flex-row items-center justify-between mb-3">
              <Text variant={TextVariant.BodyMd}>Performance Profiler</Text>
              <Pressable
                onPress={hideProfiler}
                style={({ pressed }) =>
                  tw.style(
                    'w-6 h-6 rounded-full items-center justify-center',
                    pressed && 'bg-pressed',
                  )
                }
              >
                <Text twClassName="text-2xl">x</Text>
              </Pressable>
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

            {appId && (
              <Box twClassName="flex-row items-center mb-3 bg-muted rounded-md p-2">
                <Text variant={TextVariant.BodyXs}>App Id: {appId}</Text>
              </Box>
            )}

            {/* Debug info */}
            <Box twClassName="mb-3 bg-muted rounded-md p-2">
              <Text variant={TextVariant.BodyXs}>
                Build: {process.env.METAMASK_BUILD_TYPE || 'undefined'}
              </Text>
              <Text variant={TextVariant.BodyXs}>
                Env: {process.env.METAMASK_ENVIRONMENT || 'undefined'}
              </Text>
              <Text variant={TextVariant.BodyXs}>
                Dev: {__DEV__ ? 'true' : 'false'}
              </Text>
            </Box>

            {/* Controls */}
            <Box twClassName="flex-row gap-2 mb-3">
              <Pressable
                style={tw.style(
                  'flex-1 p-2 rounded-md items-center justify-center',
                  isRecording ? 'bg-error-default' : 'bg-primary-default',
                )}
                onPress={toggleProfiling}
              >
                <Text twClassName="text-white" variant={TextVariant.BodySm}>
                  {isRecording ? 'Stop' : 'Start'}
                </Text>
              </Pressable>
            </Box>

            <Box twClassName="pt-3 border-t border-muted">
              <Text variant={TextVariant.BodyXs}>
                Shake device to toggle this menu
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ProfilerManager;
