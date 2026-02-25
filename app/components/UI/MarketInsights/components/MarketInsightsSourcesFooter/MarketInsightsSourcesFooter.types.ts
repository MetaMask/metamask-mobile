import type { MarketInsightsSource } from '@metamask/ai-controllers';

export interface MarketInsightsSourcesFooterProps {
  /** List of sources used for the report */
  sources: MarketInsightsSource[];
  /** Callback when sources pill is pressed */
  onSourcesPress?: () => void;
  /** Callback for thumbs up interaction */
  onThumbsUp?: () => void;
  /** Callback for thumbs down interaction */
  onThumbsDown?: () => void;
  /** Optional test ID */
  testID?: string;
}

export interface MarketInsightsSourcesBottomSheetProps {
  /** Whether the bottom sheet is visible */
  isVisible: boolean;
  /** Callback when the bottom sheet is closed */
  onClose: () => void;
  /** List of sources to display */
  sources: MarketInsightsSource[];
  /** Callback when a source URL is pressed */
  onSourcePress?: (url: string) => void;
}
