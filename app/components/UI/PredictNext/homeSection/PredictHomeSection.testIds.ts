export const PredictHomeSectionTestIds = {
  POSITIONS: 'predict-next-home-positions',
  POSITION_ROW: 'predict-next-home-position-row',
  POSITION_ROW_SKELETON: 'predict-next-home-position-row-skeleton',
  POSITION_ROW_VALUE: 'predict-next-home-position-row-value',
  POSITION_ROW_VALUE_UNAVAILABLE:
    'predict-next-home-position-row-value-unavailable',
  POSITION_ROW_PNL: 'predict-next-home-position-row-pnl',
  /** Same id as the legacy row, so Homepage journeys find either Venue's. */
  UNREALIZED_PNL: 'homepage-predict-unrealized-pnl',
} as const;
