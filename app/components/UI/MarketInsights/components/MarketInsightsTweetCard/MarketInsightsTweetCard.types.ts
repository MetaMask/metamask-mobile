import type { MarketInsightsTweet } from '@metamask-previews/ai-controllers';

export interface MarketInsightsTweetCardProps {
  /** The tweet data to render */
  tweet: MarketInsightsTweet;
  /** Callback when the tweet card or X icon is pressed (opens URL) */
  onPress?: () => void;
  /** Optional test ID */
  testID?: string;
}
