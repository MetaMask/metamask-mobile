import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { SocialLeaderboard } from '../../../SocialLeaderboard';

interface TokenDetailsHoldersTabProps {
  assetId: CaipAssetType;
}

/**
 * Ranked holders of the token on screen. Same list as the Social leaderboard,
 * scoped to this CAIP-19 asset.
 */
const TokenDetailsHoldersTab: React.FC<TokenDetailsHoldersTabProps> = ({
  assetId,
}) => (
  <Box twClassName="pt-4">
    <SocialLeaderboard
      source={{ kind: 'token', assetId }}
      location="token_details"
      showViewerRow
    />
  </Box>
);

export default TokenDetailsHoldersTab;
