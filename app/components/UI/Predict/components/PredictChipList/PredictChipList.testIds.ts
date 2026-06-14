export const PREDICT_CHIP_LIST_TEST_IDS = {
  CONTAINER: 'predict-chip-list',
  CHIP: 'predict-chip',
  CHIP_LABEL: 'predict-chip-label',
} as const;

export const getPredictChipTestId = (key: string) =>
  `${PREDICT_CHIP_LIST_TEST_IDS.CHIP}-${key}` as const;

export const getPredictChipLabelTestId = (key: string) =>
  `${PREDICT_CHIP_LIST_TEST_IDS.CHIP_LABEL}-${key}` as const;
