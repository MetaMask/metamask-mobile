import Engine from '../../../core/Engine';
import { toHex } from '@metamask/controller-utils';

export const removeNft = ({
  selectedAddress,
  chainId,
  longPressedCollectible,
  removeFavoriteCollectible,
  networkConfigurations,
}) => {
  const { NftController } = Engine.context;
  removeFavoriteCollectible(
    selectedAddress,
    chainId,
    longPressedCollectible.current,
  );
  const chainIdHex = toHex(longPressedCollectible.current.chainId);
  const config = networkConfigurations[chainIdHex];
  const nftNetworkClientId =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    config?.rpcEndpoints?.[config.defaultRpcEndpointIndex]?.networkClientId;

  NftController.removeAndIgnoreNft(
    longPressedCollectible.current.address,
    longPressedCollectible.current.tokenId,
    {
      networkClientId: nftNetworkClientId,
      userAddress: selectedAddress,
    },
  );
};
