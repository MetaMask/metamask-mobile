import React from 'react';
import { TokenI } from '../../../Tokens/types';
import { Hex } from '@metamask/utils';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';

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
  const networkImage = chainId ? getNetworkImageSource({ chainId }) : undefined;

  if (isMoneyAccountEntry ?? asset?.isMoneyAccountEntry) {
    return (
      <MoneyBalanceIcon
        width={40}
        height={40}
        name="money-balance"
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
      badge={networkImage ? <BadgeNetwork src={networkImage} /> : null}
    >
      <AssetLogo asset={asset} />
    </BadgeWrapper>
  );
};

export default CardAssetItem;
