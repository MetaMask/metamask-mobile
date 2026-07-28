import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reduce-motion setting with an explicit unresolved state: `null` until the
 * async check resolves. Use this when content must be withheld (not rendered
 * statically) while the setting is unknown, to avoid a static-to-animated
 * flash on first paint.
 */
export function useReduceMotionState(): boolean | null {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
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

  return reduceMotion;
}

export function useReduceMotion(): boolean {
  // Default to true so callers don't animate before the async check resolves —
  // otherwise a user with reduce-motion enabled briefly sees the animation.
  return useReduceMotionState() ?? true;
}
