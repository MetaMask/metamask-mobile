import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import type { SocialFeedPostShellProps } from '../../../SocialFeed/components/SocialFeedPostShell';
import { TokenDetailsFeed } from './TokenDetailsFeed';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  /** The visible tab pages alone follow the page scroll for more posts. */
  isActive?: boolean;
  /** True when this wallet holds the token. Picks the empty-state copy. */
  hasBalance?: boolean;
  /** Reports whether the feed is showing its empty state. */
  onEmptyChange?: (isEmpty: boolean) => void;
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
  onCopyTrade,
  isActive,
  hasBalance,
  onEmptyChange,
}) => (
  <Box twClassName="pt-4">
    <TokenDetailsFeed
      source={{ kind: 'token', assetId }}
      location="token_details"
      onCopyTrade={onCopyTrade}
      isActive={isActive}
      hasBalance={hasBalance}
      onEmptyChange={onEmptyChange}
    />
  </Box>
);

export default TokenDetailsFeedTab;
