import { PredictMarket } from '../../types';

/**
 * Props for the TimeSlotPicker component.
 *
 * Displays a horizontal scrollable strip of pill-shaped items representing
 * time windows (past, live, future) for crypto Up/Down prediction market series.
 */
export interface TimeSlotPickerProps {
  /** Array of markets from usePredictSeries, ordered by endDate. */
  markets: PredictMarket[];
  /**
   * Optional selected market ID.
   * If provided, that market is selected.
   * If omitted, the live market is auto-selected (or nearest to now).
   */
  selectedMarketId?: string;
  /** Callback fired when the user taps a pill. */
  onMarketSelected: (market: PredictMarket) => void;
}
