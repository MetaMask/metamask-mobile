import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { SocialLeaderboard } from '../../../SocialLeaderboard';

interface TokenDetailsHoldersTabProps {
  assetId: CaipAssetType;
}

/**
 * The same ranked list Social shows. Unscoped: `GET /api/v1/leaderboard`
 * has no asset id, so this is not filtered to the token on screen.
 *
 * TODO: Scope `source` to `assetId` once that route can rank traders for one asset.
 */
const TokenDetailsHoldersTab: React.FC<TokenDetailsHoldersTabProps> = ({
  assetId: _assetId,
}) => (
  <Box twClassName="pt-4" testID="token-details-v1-holders-leaderboard">
    <SocialLeaderboard
      source={{ kind: 'all' }}
      location="token_details"
      showViewerRow
    />
  </Box>
);

export default TokenDetailsHoldersTab;
