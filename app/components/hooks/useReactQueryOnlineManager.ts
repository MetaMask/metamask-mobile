import { useEffect } from 'react';
import { Platform } from 'react-native';
import { addEventListener as addNetInfoEventListener } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * Syncs React Query's online status with the device's actual network state
 * via NetInfo. Without this, React Query assumes the app is always online
 * in React Native environments.
 */
export function useReactQueryOnlineManager() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    return onlineManager.setEventListener((setOnline) =>
      addNetInfoEventListener((state) => {
        setOnline(!!state.isConnected);
      }),
    );
  }, []);
}
