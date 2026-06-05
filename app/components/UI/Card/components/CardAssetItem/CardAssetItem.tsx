import React, { useMemo } from 'react';
import { Image } from 'react-native';
import { TokenI } from '../../../Tokens/types';
import { Hex } from '@metamask/utils';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import musdAssetIcon from '../../../../../images/musd-icon-2x.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';

interface CardAssetItemProps {
  asset: (TokenI & { isMoneyAccountEntry?: boolean }) | undefined;
  privacyMode?: boolean;
  onPress?: (asset: TokenI) => void;
  balanceFormatted?: string;
  isMoneyAccountEntry?: boolean;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({
  asset,
  isMoneyAccountEntry,
}) => {
  const chainId = asset?.chainId as Hex;
  const tw = useTailwind();
  const networkBadgeSource = useMemo(
    () => (chainId ? NetworkBadgeSource(chainId) : null),
    [chainId],
  );

  if (isMoneyAccountEntry ?? asset?.isMoneyAccountEntry) {
    return (
      <Image
        source={musdAssetIcon}
        style={tw.style('w-10 h-10 rounded-10')}
        testID="card-asset-item-money-account"
      />
    );
  }

  // Return null if chainId or asset is missing
  if (!chainId || !asset) {
    return null;
  }

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        networkBadgeSource ? (
          <BadgeNetwork imageOrSvgProps={networkBadgeSource} />
        ) : null
      }
    >
      <AssetLogo asset={asset} />
    </BadgeWrapper>
  );
};

export default CardAssetItem;
