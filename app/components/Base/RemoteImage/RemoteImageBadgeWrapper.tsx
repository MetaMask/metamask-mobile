import React, { PropsWithChildren, useCallback } from 'react';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  isLineaMainnetChainId,
  isMainNet,
  isSolanaMainnet,
  isTestNet,
} from '../../../util/networks';
import images from 'images/image-icons';
import { selectNetworkName } from '../../../selectors/networkInfos';

import { BadgeAnchorElementShape } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { toHex } from '@metamask/controller-utils';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
} from '../../../util/networks/customNetworks';

interface RemoteImageBadgeWrapperProps {
  chainId?: number;
  isFullRatio?: boolean;
}

const RemoteImageBadgeWrapper = (
  props: PropsWithChildren<RemoteImageBadgeWrapperProps>,
) => {
  // The chainId would be passed in props from parent for collectible media
  //TODO remove once migrated to TS and chainID is properly typed to hex
  const currentChainId = useSelector(selectChainId);
  const chainId = props.chainId ? toHex(props.chainId) : currentChainId;
  const networkName = useSelector(selectNetworkName);

  const NetworkBadgeSource = useCallback(() => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet(chainId)) return images.ETHEREUM;

    if (isLineaMainnetChainId(chainId)) return images['LINEA-MAINNET'];

    if (isSolanaMainnet(chainId)) return images.SOLANA;

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === chainId,
    );
    const network = unpopularNetwork || popularNetwork;
    const customNetworkImg = CustomNetworkImgMapping[chainId as `0x${string}`];

    if (network) {
      return network.rpcPrefs.imageSource;
    } else if (customNetworkImg) {
      return customNetworkImg;
    }
    return undefined;
  }, [chainId]);

  return (
    <BadgeWrapper
      badgePosition={{
        bottom: 5,
        right: 5,
      }}
      anchorElementShape={BadgeAnchorElementShape.Rectangular}
      badgeElement={
        <Badge
          variant={BadgeVariant.Network}
          imageSource={NetworkBadgeSource()}
          name={networkName}
          isScaled={false}
          size={props.isFullRatio ? AvatarSize.Md : AvatarSize.Xs}
        />
      }
    >
      {props.children}
    </BadgeWrapper>
  );
};

export default RemoteImageBadgeWrapper;
