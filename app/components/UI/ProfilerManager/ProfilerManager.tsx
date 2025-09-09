import React, { useState, useCallback } from 'react';
import { Platform, Pressable, Share } from 'react-native';
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
import { isRc } from '../../../util/test/utils';

interface ProfilerManagerProps {
  enabled?: boolean;
}

const ProfilerManager: React.FC<ProfilerManagerProps> = ({
  enabled = isRc,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastProfilePath, setLastProfilePath] = useState<string | null>(null);
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
      const path = await stopProfiling(true);
      if (typeof path === 'string' && path.length > 0) {
        setLastProfilePath(path);
      }
    } catch (error) {
      // fail silently
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
