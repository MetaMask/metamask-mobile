import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import type { SocialFeedPostShellProps } from '../../../SocialFeed/components/SocialFeedPostShell';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import { TokenDetailsFeed } from './TokenDetailsFeed';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  /** The visible tab pages alone follow the page scroll for more posts. */
  isActive?: boolean;
  /** True when this wallet holds the token. Picks the empty-state copy. */
  hasBalance?: boolean;
  /** Token on screen, so the empty-state post opens on this holding. */
  token?: TokenDetailsRouteParams;
  /** Reports whether the feed is showing its empty state. */
  onEmptyChange?: (isEmpty: boolean) => void;
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
  onCopyTrade,
  isActive,
  hasBalance,
  token,
  onEmptyChange,
}) => (
  <Box twClassName="pt-4">
    <TokenDetailsFeed
      source={{ kind: 'token', assetId }}
      location="token_details"
      onCopyTrade={onCopyTrade}
      isActive={isActive}
      hasBalance={hasBalance}
      token={token}
      onEmptyChange={onEmptyChange}
    />
  </Box>
);

export default TokenDetailsFeedTab;
