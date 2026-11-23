import type { PredictConfiguredVenue } from '../implementation';

export const PredictVenueSelectorTestIds = {
  BUTTON: 'predict-venue-selector-button',
  SHEET: 'predict-venue-selector-sheet',
  CLOSE_BUTTON: 'predict-venue-selector-close',
  option: (venue: PredictConfiguredVenue) =>
    `predict-venue-selector-option-${venue}`,
} as const;
