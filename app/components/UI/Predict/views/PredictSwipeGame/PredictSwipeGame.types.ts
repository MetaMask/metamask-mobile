import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';

/**
 * Token information for betting (Yes or No)
 */
export interface SwipeOutcomeToken {
  id: string; // CLOB token ID needed for trading
  title: string; // "Yes" or "No"
  price: number; // Current price (0-1)
}

/**
 * Primary outcome selected for the swipe card
 */
export interface SwipePrimaryOutcome {
  outcomeId: string;
  yesToken: SwipeOutcomeToken;
  noToken: SwipeOutcomeToken;
  title: string; // e.g., "Will Bitcoin hit $100k?"
  negRisk?: boolean;
  tickSize?: string;
}

/**
 * Alternative outcome for multi-outcome markets
 */
export interface SwipeAlternativeOutcome {
  outcomeId: string;
  title: string;
  volume: number;
  yesToken: SwipeOutcomeToken;
  noToken: SwipeOutcomeToken;
  negRisk?: boolean;
  tickSize?: string;
}

/**
 * Transformed market data optimized for swipe game UI
 */
export interface SwipeGameCard {
  // Market identification
  marketId: string;
  providerId: string;

  // Display info
  title: string;
  description: string;
  image: string;
  endDate?: string;

  // Primary bet (highest volume outcome for multi-outcome markets)
  primaryOutcome: SwipePrimaryOutcome;

  // Alternative outcomes (for multi-outcome markets, sorted by volume)
  alternativeOutcomes: SwipeAlternativeOutcome[];

  // Metadata
  totalVolume: number;
  liquidity: number;
  isMultiOutcome: boolean;
  tags: string[];
}

/**
 * Order preview for a single side (Yes or No)
 */
export interface SwipeBetPreview {
  sharePrice: number;
  estimatedShares: number;
  potentialWin: number; // Net profit if outcome is correct
  odds: string; // e.g., "2.5x"
  maxAmountSpent: number;
  minAmountReceived: number;
  fees?: {
    metamaskFee: number;
    providerFee: number;
    totalFee: number;
  };
}

/**
 * Combined preview for both Yes and No bets on a card
 */
export interface CardPreview {
  cardId: string;
  betAmount: number;

  yesPreview: SwipeBetPreview | null;
  noPreview: SwipeBetPreview | null;

  isLoading: boolean;
  error: string | null;
  timestamp: number;
}

/**
 * Swipe action types
 */
export type SwipeAction = 'yes' | 'no' | 'skip';

/**
 * Swipe direction based on gesture
 */
export type SwipeDirection = 'left' | 'right' | 'down' | 'none';

/**
 * Game session statistics
 */
export interface SwipeGameSessionStats {
  betsPlaced: number;
  totalWagered: number;
  skipped: number;
  startTime: number;
}

/**
 * Undo toast state
 */
export interface UndoToastState {
  isVisible: boolean;
  betType: 'yes' | 'no';
  marketTitle: string;
  betAmount: number;
  potentialWin: number;
  startTime: number;
}

/**
 * Main game state
 */
export interface SwipeGameState {
  cards: SwipeGameCard[];
  currentIndex: number;
  betAmount: number;
  isLoading: boolean;
  isPendingOrder: boolean;
  error: string | null;
  sessionStats: SwipeGameSessionStats;
}

/**
 * Props for SwipeCard component
 */
export interface SwipeCardProps {
  card: SwipeGameCard;
  preview: CardPreview | null;
  betAmount: number;
  isActive: boolean;
  onOutcomeChange?: (outcomeId: string) => void;
  /** Optional overlay to render on top of the card (for swipe feedback) */
  overlay?: React.ReactNode;
}

/**
 * Gesture configuration
 */
export interface SwipeGestureConfig {
  horizontalThreshold: number; // Min X distance to trigger action
  verticalThreshold: number; // Min Y distance for skip
  snapBackDuration: number; // Animation duration for snap back (ms)
  exitDuration: number; // Animation duration for exit (ms)
  velocityThreshold: number; // Min velocity to trigger action
}

/**
 * Re-export relevant types from parent
 */
export type { PredictMarket, PredictOutcome, PredictOutcomeToken };
