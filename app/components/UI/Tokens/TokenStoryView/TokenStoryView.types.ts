import { TokenI } from '../types';

/**
 * Props for the TokenStoryView component
 */
export interface TokenStoryViewProps {
  /**
   * Initial token index to display (defaults to 0)
   */
  initialIndex?: number;
  /**
   * Callback when the view is closed
   */
  onClose?: () => void;
}

/**
 * Props for the TokenStoryCard component
 */
export interface TokenStoryCardProps {
  /**
   * Token data to display
   */
  token: TokenI;
  /**
   * Whether this card is currently active/visible
   */
  isActive: boolean;
  /**
   * Callback to navigate to full token details
   */
  onViewDetails?: () => void;
  /**
   * Index of this card in the list
   */
  index: number;
  /**
   * Total number of tokens
   */
  totalCount: number;
}

/**
 * Navigation indicator props
 */
export interface TokenStoryIndicatorProps {
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
