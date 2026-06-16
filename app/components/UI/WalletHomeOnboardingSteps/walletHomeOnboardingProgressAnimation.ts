import {
  cancelAnimation,
  Easing,
  runOnJS,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS } from './walletHomeOnboardingChecklistRive';

export const walletHomeOnboardingProgressTimingConfig = (
  durationMs: number,
) => ({
  duration: durationMs,
  easing: Easing.out(Easing.cubic),
});

export interface AnimateWalletHomeOnboardingProgressOptions {
  /** When true, snap immediately (tests / E2E). */
  instant?: boolean;
  onComplete?: (finished: boolean) => void;
}

/**
 * Drive the checklist progress ratio on the UI thread.
 */
export function animateWalletHomeOnboardingProgressRatio(
  progressRatio: SharedValue<number>,
  target: number,
  options?: AnimateWalletHomeOnboardingProgressOptions,
): void {
  const duration = options?.instant
    ? 0
    : WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS;
  const { onComplete } = options ?? {};

  cancelAnimation(progressRatio);

  if (duration === 0) {
    progressRatio.value = target;
    onComplete?.(true);
    return;
  }

  progressRatio.value = withTiming(
    target,
    walletHomeOnboardingProgressTimingConfig(duration),
    (finished) => {
      'worklet';
      if (onComplete) {
        runOnJS(onComplete)(finished ?? false);
      }
    },
  );
}
