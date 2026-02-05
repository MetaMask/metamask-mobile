import { PredictMarket, PredictCategory } from '../../types';

/**
 * Props for the PredictStoryView component
 */
export interface PredictStoryViewProps {
  /**
   * Initial market index to display (defaults to 0)
   */
  initialIndex?: number;
  /**
   * Category to filter markets (defaults to 'trending')
   */
  category?: PredictCategory;
  /**
   * Callback when the view is closed
   */
  onClose?: () => void;
}

/**
 * Props for the PredictStoryCard component
 */
export interface PredictStoryCardProps {
  /**
   * Prediction market data to display
   */
  market: PredictMarket;
  /**
   * Whether this card is currently active/visible
   */
  isActive: boolean;
  /**
   * Callback to navigate to full market details
   */
  onViewDetails?: () => void;
  /**
   * Index of this card in the list
   */
  index: number;
  /**
   * Total number of markets
   */
  totalCount: number;
}

/**
 * Navigation indicator props
 */
export interface PredictStoryIndicatorProps {
  /**
   * Current page index
   */
  currentIndex: number;
  /**
   * Total number of pages
   */
  totalCount: number;
  /**
   * Maximum indicators to show (default: 5)
   */
  maxIndicators?: number;
}
