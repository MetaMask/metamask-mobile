import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { SocialFeed } from '../../../SocialFeed';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
}) => (
  <Box twClassName="pt-4">
    <SocialFeed source={{ kind: 'token', assetId }} location="token_details" />
  </Box>
);

export default TokenDetailsFeedTab;
