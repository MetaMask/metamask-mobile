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
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
  onCopyTrade,
  isActive,
}) => (
  <Box twClassName="pt-4">
    <TokenDetailsFeed
      source={{ kind: 'token', assetId }}
      location="token_details"
      onCopyTrade={onCopyTrade}
      isActive={isActive}
    />
  </Box>
);

export default TokenDetailsFeedTab;
