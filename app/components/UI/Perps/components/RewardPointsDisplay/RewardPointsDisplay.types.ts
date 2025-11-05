/**
 * Reward display states matching the design specifications
 */
export enum RewardDisplayState {
  /** Empty fox icon, no points visible */
  Preload = 'preload',
  /** Fox icon with shimmer animation */
  Loading = 'loading',
  /** Fox icon with points and discount tag */
  Loaded = 'loaded',
  /** Fox icon spins and reveals updated points */
  Refresh = 'refresh',
  /** Couldn't load points error state */
  ErrorState = 'error',
}

/**
 * Props for the RewardPointsDisplay component
 */
export interface RewardPointsDisplayProps {
  /** Estimated points to display */
  estimatedPoints?: number;

  /** Bonus multiplier in basis points (100 = 1%) */
  bonusBips?: number;

  /** Loading state for points calculation */
  isLoading?: boolean;

  /** Error state */
  hasError?: boolean;

  /** Whether to show the rewards row at all */
  shouldShow?: boolean;

  /** Whether this is a refresh operation (triggers spin animation) */
  isRefresh?: boolean;
}

/**
 * Style sheet input parameters
 */
export interface RewardPointsDisplayStyleSheetVars {
  state: RewardDisplayState;
}
