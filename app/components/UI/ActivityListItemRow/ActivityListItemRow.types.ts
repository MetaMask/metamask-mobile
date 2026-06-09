import type {
  ActivityListItem,
  TokenAmount,
} from '../../../util/activity-adapters';

export interface ActivityListItemRowProps {
  item: ActivityListItem;
  index?: number;
  chainId?: string;
  onPress?: (item: ActivityListItem) => void;
}

export interface ActivityListItemRowContent {
  title: string;
  subtitle?: string;
  primaryToken?: TokenAmount;
  primaryAmount?: string;
  secondaryAmount?: string;
  avatarTokens: TokenAmount[];
}
