/**
 * Test IDs for Predict activity list rows (Activity → Predictions tab).
 * Row id is derived from {@link PredictActivityItem.id} (e.g. transaction hash).
 */
export const PredictActivitySelectorsIDs = {
  /** Lowercase so Detox matches regardless of API checksum casing. */
  row: (activityId: string) =>
    `predict-activity-row-${activityId.toLowerCase()}`,
} as const;
