import { Box } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import SocialFeed from '../../SocialFeed/components/SocialFeed';

export interface TokenDetailsFeedProps {
  /** CAIP-19 id of the token. Unsupported assets have no feed. */
  assetId: CaipAssetType | null;
}

/**
 * Token details Feed tab. Social owns the posts, paging, and empty states.
 * This host only names the source.
 */
const TokenDetailsFeed: React.FC<TokenDetailsFeedProps> = ({ assetId }) => {
  if (!assetId) {
    return null;
  }

  return (
    <Box
      testID={TokenOverviewSelectorsIDs.FEED}
      twClassName="w-full flex-none pt-3"
    >
      <SocialFeed
        source={{ kind: 'token', assetId }}
        location="token_details"
      />
    </Box>
  );
};

export default TokenDetailsFeed;
