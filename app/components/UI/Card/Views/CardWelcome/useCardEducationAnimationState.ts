import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSelector } from 'react-redux';
import Logger from '../../../../../util/Logger';
import { selectMoneyCardEducationAnimationEnabledFlag } from '../../../Money/selectors/featureFlags';

export type CardEducationAnimationState = 'pending' | 'animate' | 'static';

export function useCardEducationAnimationState(): CardEducationAnimationState {
  const flagEnabled = useSelector(selectMoneyCardEducationAnimationEnabledFlag);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch((error) => {
        Logger.error(
          error as Error,
          '[Card Education Animation] Failed to read reduce motion setting',
        );
        // Treat an unknown reduce-motion setting as ON so the screen renders
        // fully without motion instead of staying hidden in 'pending'.
        if (mounted) setReduceMotion(true);
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!flagEnabled) {
    return 'static';
  }
  if (reduceMotion === null) {
    return 'pending';
  }
  if (reduceMotion) {
    return 'static';
  }
  return 'animate';
}
