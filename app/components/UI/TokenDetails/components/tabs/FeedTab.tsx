import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { SocialFeed, type SocialFeedProps } from '../../../SocialFeed';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
  onCopyTrade?: SocialFeedProps['onCopyTrade'];
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
  onCopyTrade,
}) => (
  <Box twClassName="pt-4">
    <SocialFeed
      source={{ kind: 'token', assetId }}
      location="token_details"
      onCopyTrade={onCopyTrade}
    />
  </Box>
);

export default TokenDetailsFeedTab;
