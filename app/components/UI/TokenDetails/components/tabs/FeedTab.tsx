import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { SocialFeed } from '../../../SocialFeed';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
}) => (
  <SocialFeed source={{ kind: 'token', assetId }} location="token_details" />
);

export default TokenDetailsFeedTab;
