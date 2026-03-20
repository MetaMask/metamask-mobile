/**
 * Test IDs for Predict activity list rows (Activity → Predictions tab).
 * Row id is derived from {@link PredictActivityItem.id} (e.g. transaction hash).
 */
export const PredictActivitySelectorsIDs = {
  row: (activityId: string) => `predict-activity-row-${activityId}`,
} as const;
