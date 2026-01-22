import React, { useMemo } from 'react';
import { TokenI } from '../../../Tokens/types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { Hex } from '@metamask/utils';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';

interface CardAssetItemProps {
  asset: TokenI | undefined;
  privacyMode?: boolean;
  onPress?: (asset: TokenI) => void;
  balanceFormatted?: string;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({ asset }) => {
  const chainId = asset?.chainId as Hex;
  const networkBadgeSource = useMemo(
    () => (chainId ? NetworkBadgeSource(chainId) : null),
    [chainId],
  );

  // Return null if chainId or asset is missing
  if (!chainId || !asset) {
    return null;
  }

  return (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        networkBadgeSource ? (
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkBadgeSource}
          />
        ) : null
      }
    >
      <AssetLogo asset={asset} />
    </BadgeWrapper>
  );
};

export default CardAssetItem;
