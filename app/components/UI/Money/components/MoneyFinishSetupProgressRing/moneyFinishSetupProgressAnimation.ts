import {
  cancelAnimation,
  Easing,
  runOnJS,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export const MONEY_FINISH_SETUP_PROGRESS_ANIMATION_MS = 650;

export const moneyFinishSetupProgressTimingConfig = (durationMs: number) => ({
  duration: durationMs,
  easing: Easing.out(Easing.cubic),
});

export interface AnimateMoneyFinishSetupProgressOptions {
  instant?: boolean;
  onComplete?: (finished: boolean) => void;
}

export function animateMoneyFinishSetupProgressRatio(
  progressRatio: SharedValue<number>,
  target: number,
  options?: AnimateMoneyFinishSetupProgressOptions,
): void {
  const duration = options?.instant
    ? 0
    : MONEY_FINISH_SETUP_PROGRESS_ANIMATION_MS;
  const { onComplete } = options ?? {};

  cancelAnimation(progressRatio);

  if (duration === 0) {
    progressRatio.value = target;
    onComplete?.(true);
    return;
  }

  progressRatio.value = withTiming(
    target,
    moneyFinishSetupProgressTimingConfig(duration),
    (finished) => {
      'worklet';
      if (onComplete) {
        runOnJS(onComplete)(finished ?? false);
      }
    },
  );
}
