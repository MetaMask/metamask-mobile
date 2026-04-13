export const PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS = {
  CONTAINER: 'outcome-group-chips',
  CHIP: 'outcome-group-chip',
  CHIP_LABEL: 'outcome-group-chip-label',
} as const;

export const getOutcomeGroupChipTestId = (key: string) =>
  `${PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS.CHIP}-${key}` as const;

export const getOutcomeGroupChipLabelTestId = (key: string) =>
  `${PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS.CHIP_LABEL}-${key}` as const;
