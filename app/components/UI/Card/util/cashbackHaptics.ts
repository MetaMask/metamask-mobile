import {
  ImpactMoment,
  fireImpact,
  playSelection,
} from '../../../../util/haptics';

/** Balance roll length on Card home (AnimatedSlotText's Laminar duration). */
export const CASHBACK_COUNT_UP_MS = 400;
/** Gap between the light ticks while the balance rolls. */
export const CASHBACK_COUNT_UP_TICK_MS = 100;

/**
 * Haptics for the cashback balance count-up: light selection ticks while the
 * digits roll, then a firmer impact as the new balance lands. With Reduce
 * Motion the balance swaps without a roll, so only the landing plays.
 * All calls go through the app haptics gates (in-app setting, kill switch).
 *
 * @returns A cancel function that stops any ticks still to come.
 */
export const playCashbackCountUpHaptics = ({
  reduceMotion = false,
  durationMs = CASHBACK_COUNT_UP_MS,
  tickMs = CASHBACK_COUNT_UP_TICK_MS,
}: {
  reduceMotion?: boolean;
  durationMs?: number;
  tickMs?: number;
} = {}): (() => void) => {
  const timers: ReturnType<typeof setTimeout>[] = [];
  if (!reduceMotion) {
    for (let at = 0; at < durationMs; at += tickMs) {
      timers.push(
        setTimeout(() => {
          playSelection().catch(() => undefined);
        }, at),
      );
    }
  }
  timers.push(
    setTimeout(
      () => fireImpact(ImpactMoment.PrimaryCTA),
      reduceMotion ? 0 : durationMs,
    ),
  );
  return () => timers.forEach(clearTimeout);
};
