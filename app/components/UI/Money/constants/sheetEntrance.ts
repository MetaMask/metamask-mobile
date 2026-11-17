import { AnimationDuration } from '@metamask/design-tokens';

/**
 * Timing for the staggered entrance played once a Money bottom sheet has
 * finished opening. Steps run top to bottom so the content reads as a single
 * wave rather than four independent fades.
 *
 * Shared by every element in the wave — including
 * `MoneyCardFlipAnimation`'s own entrance, which is step 0 — so the cadence
 * stays consistent when one of them is tuned.
 */
export const MONEY_SHEET_ENTRANCE_DURATION_MS = AnimationDuration.Regularly;

/** Gap between consecutive steps of the wave. */
export const MONEY_SHEET_ENTRANCE_STAGGER_MS = 60;

/** Distance each step rises into place, in points. */
export const MONEY_SHEET_ENTRANCE_TRANSLATE_Y = 12;

/**
 * Position of each element in the top-to-bottom wave. The card is step 0; its
 * entrance lives inside `MoneyCardFlipAnimation` alongside the Rive flip.
 */
export enum MoneySheetEntranceStep {
  Illustration = 0,
  Title = 1,
  Description = 2,
  Footer = 3,
}

/** Delay before the given step of the wave starts. */
export const moneySheetEntranceDelay = (step: MoneySheetEntranceStep): number =>
  step * MONEY_SHEET_ENTRANCE_STAGGER_MS;

/**
 * What a step of the wave should be doing right now.
 *
 * - `hold`: hidden and offset, waiting its turn.
 * - `settle`: present with no motion at all (reduce motion).
 * - `play`: run the fade and rise.
 */
export type MoneySheetEntrancePhase = 'hold' | 'settle' | 'play';

export interface MoneySheetEntrancePhaseInput {
  /** `null` while the accessibility setting is still resolving. */
  reduceMotionState: boolean | null;
  /** Whether the sheet has finished opening and released the wave. */
  isActive: boolean;
}

export const resolveMoneySheetEntrancePhase = ({
  reduceMotionState,
  isActive,
}: MoneySheetEntrancePhaseInput): MoneySheetEntrancePhase => {
  // Unresolved: hold rather than guess, so the wave can't start under a
  // setting that turns out to forbid it and get cut short mid-flight.
  if (reduceMotionState === null) return 'hold';

  // Reduce motion wins over the wave, and applies before the sheet opens —
  // the content is simply there.
  if (reduceMotionState) return 'settle';

  return isActive ? 'play' : 'hold';
};
