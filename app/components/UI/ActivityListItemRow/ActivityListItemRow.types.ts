import type {
  ActivityListItem,
  TokenAmount,
} from '../../../util/activity-adapters';

export interface ActivityListItemRowProps {
  item: ActivityListItem;
  index?: number;
  onPress?: (item: ActivityListItem) => void;
  /**
   * Optional pre-resolved title. Used to preserve the legacy Activity contract
   * for swap/bridge rows derived from bridge history.
   */
  title?: string;
}

export interface ActivityListItemRowContent {
  title: string;
  subtitle?: string;
  primaryToken?: TokenAmount;
  secondaryToken?: TokenAmount;
  primaryAmount?: string;
  secondaryAmount?: string;
  avatarTokens: TokenAmount[];
}
