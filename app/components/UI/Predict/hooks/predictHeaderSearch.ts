type PredictHeaderSearchOpener = () => boolean;

let opener: PredictHeaderSearchOpener | null = null;
let closer: (() => void) | null = null;

/** Predict home registers the header search button so the footer can press it. */
export const registerPredictHeaderSearch = (
  next: PredictHeaderSearchOpener | null,
): void => {
  opener = next;
};

/** Predict home registers a way to dismiss the header search overlay. */
export const registerPredictHeaderSearchClose = (
  next: (() => void) | null,
): void => {
  closer = next;
};

/** Opens the header search when that screen is focused. */
export const openPredictHeaderSearch = (): boolean => opener?.() ?? false;

/** Dismisses the header search overlay on the predictions home. */
export const closePredictHeaderSearch = (): void => {
  closer?.();
};
