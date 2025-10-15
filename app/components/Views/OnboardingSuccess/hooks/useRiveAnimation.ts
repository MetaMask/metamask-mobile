import { useCallback, useEffect, useRef } from 'react';
import { RiveRef } from 'rive-react-native';
import { isE2E } from '../../../../util/test/utils';

export interface RiveAnimationConfig {
  stateMachineName: string;
  darkModeInputName: string;
  startTriggerName: string;
}

export const useRiveAnimation = (
  isDarkMode: boolean,
  config: RiveAnimationConfig,
) => {
  const riveRef = useRef<RiveRef>(null);
  const riveTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const clearRiveTimer = useCallback(() => {
    if (isE2E) return;
    if (riveTimeoutId.current) {
      clearTimeout(riveTimeoutId.current);
      riveTimeoutId.current = null;
    }
  }, []);

  const startRiveAnimation = useCallback(() => {
    if (isE2E) return;

    if (!riveRef.current) {
      return;
    }

    if (riveTimeoutId.current) {
      clearTimeout(riveTimeoutId.current);
    }

    riveTimeoutId.current = setTimeout(() => {
      if (riveRef.current) {
        try {
          // Only set dark mode input exists
          if (config.darkModeInputName) {
            riveRef.current.setInputState(
              config.stateMachineName,
              config.darkModeInputName,
              isDarkMode,
            );
          }
          riveRef.current.fireState(
            config.stateMachineName,
            config.startTriggerName,
          );
        } catch (error) {
          console.error('Error with Rive animation:', error);
        }
      }
      riveTimeoutId.current = null;
    }, 100);
  }, [isDarkMode, config]);

  useEffect(() => {
    if (isE2E) return;

    startRiveAnimation();

    return () => {
      clearRiveTimer();
    };
  }, [startRiveAnimation, clearRiveTimer]);

  return {
    riveRef,
    startRiveAnimation,
    clearRiveTimer,
  };
};
