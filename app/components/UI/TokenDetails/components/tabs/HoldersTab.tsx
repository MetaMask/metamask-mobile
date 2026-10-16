import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import LeaderboardShellTabPage from '../../../../Views/SocialLeaderboard/shell/LeaderboardShellTabPage';

interface TokenDetailsHoldersTabProps {
  assetId: CaipAssetType;
}

/**
 * The same leaderboard page Social shows. Unscoped: `GET /api/v1/leaderboard`
 * has no asset id, so this is not filtered to the token on screen.
 *
 * TODO: Scope this to `assetId` once that route can rank traders for one asset.
 */
const TokenDetailsHoldersTab: React.FC<TokenDetailsHoldersTabProps> = ({
  assetId: _assetId,
}) => (
  <Box twClassName="flex-1 pt-4">
    <LeaderboardShellTabPage containerTestID="token-details-v1-holders-leaderboard" />
  </Box>
);

export default TokenDetailsHoldersTab;
