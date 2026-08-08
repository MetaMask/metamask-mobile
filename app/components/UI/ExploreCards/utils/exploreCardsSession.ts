/**
 * In-memory (module-level) deck-completion state. Intentionally not Redux and
 * not persisted — app restart clears it, which is acceptable for the POC.
 */
let completedHourSeed: number | null = null;

/** Hour-granularity seed: everyone gets a stable deck for the current hour. */
export const getCurrentHourSeed = (): number =>
  Math.floor(Date.now() / 3_600_000);

export const markDeckCompleted = (): void => {
  completedHourSeed = getCurrentHourSeed();
};

export const isDeckCompletedThisHour = (): boolean =>
  completedHourSeed === getCurrentHourSeed();

/** Forget the completion marker (user asked to restart the deck). */
export const clearDeckCompleted = (): void => {
  completedHourSeed = null;
};

/** Minutes until the next hour rolls over (for the empty-state countdown). */
export const getMinutesUntilNextDeck = (): number => {
  const msIntoHour = Date.now() % 3_600_000;
  return Math.max(1, Math.ceil((3_600_000 - msIntoHour) / 60_000));
};
