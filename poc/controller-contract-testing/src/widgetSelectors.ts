import type { WidgetControllerState } from './WidgetController';

/**
 * Selector consumed by the UI. If the controller's state shape changes
 * (e.g. `priceCents` is removed from `Widget`), this selector will return
 * undefined for the formatted total — exactly the kind of bug the
 * three-layer test approach should catch before e2e.
 */
export const selectWidgetTotalCents = (state: WidgetControllerState): number =>
  Object.values(state.widgets).reduce((sum, w) => sum + w.priceCents, 0);

export const selectWidgetCount = (state: WidgetControllerState): number =>
  Object.keys(state.widgets).length;
