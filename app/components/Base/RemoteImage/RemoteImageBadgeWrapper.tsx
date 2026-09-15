import React, { PropsWithChildren, useCallback, useMemo } from 'react';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPositionAnchorShape,
} from '@metamask/design-system-react-native';
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

  const networkBadgeSource = useCallback(() => {
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

  const networkBadgeSizeClassName = useMemo(
    () => (props.isFullRatio ? 'h-8 w-8' : 'h-4 w-4'),
    [props.isFullRatio],
  );

  return (
    <BadgeWrapper
      twClassName="self-auto"
      positionAnchorShape={BadgeWrapperPositionAnchorShape.Rectangular}
      customPosition={{
        bottom: 5,
        right: 5,
      }}
      badge={
        <BadgeNetwork
          src={networkBadgeSource()}
          name={networkName}
          twClassName={networkBadgeSizeClassName}
        />
      }
    >
      {props.children}
    </BadgeWrapper>
  );
};

export default RemoteImageBadgeWrapper;
