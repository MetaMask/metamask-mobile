import React from 'react';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { Hex, CaipChainId } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { BridgeToken } from '../../types';
import {
  AllowedBridgeChainIds,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { getTokenImageSource } from '../../utils';

export function TransactionTokenIcon({
  token,
  chainId,
  showNetworkBadge = true,
}: {
  token: BridgeToken;
  chainId: Hex | CaipChainId;
  showNetworkBadge?: boolean;
}) {
  const networkName =
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[chainId as AllowedBridgeChainIds];
  const networkImageSource = getNetworkImageSource({ chainId });
  const isNative = isNativeAddress(token.address);

  const tokenIcon = (
    <AvatarToken
      name={token.symbol}
      imageSource={getTokenImageSource(
        token.symbol,
        token.image,
        token.address,
        token.chainId,
      )}
      size={AvatarSize.Md}
      testID={
        isNative ? `network-logo-${token.symbol}` : `token-logo-${token.symbol}`
      }
    />
  );

  if (!showNetworkBadge) {
    return tokenIcon;
  }

  return (
    <BadgeWrapper
      badgePosition={BadgePosition.BottomRight}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          name={networkName}
          imageSource={networkImageSource}
        />
      }
    >
      {tokenIcon}
    </BadgeWrapper>
  );
}
