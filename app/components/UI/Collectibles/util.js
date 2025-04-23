import Engine from '../../../core/Engine';
import { toHex } from '@metamask/controller-utils';
import { strings } from '../../../../locales/i18n';
import { Alert } from 'react-native';

export const refreshMetadata = (collectible, networkConfigurations) => {
  const { NftController } = Engine.context;

  const chainIdHex = toHex(collectible.chainId);
  const config = networkConfigurations[chainIdHex];
  const nftNetworkClientId =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    config?.rpcEndpoints?.[config.defaultRpcEndpointIndex]?.networkClientId;

  NftController.addNft(
    collectible.address,
    collectible.tokenId,
    nftNetworkClientId,
  );
};

export const removeNft = (
  collectible,
  networkConfigurations,
  selectedAddress,
) => {
  const { NftController } = Engine.context;

  const chainIdHex = toHex(collectible.chainId);
  const config = networkConfigurations[chainIdHex];
  const nftNetworkClientId =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    config?.rpcEndpoints?.[config.defaultRpcEndpointIndex]?.networkClientId;

  NftController.removeAndIgnoreNft(collectible.address, collectible.tokenId, {
    networkClientId: nftNetworkClientId,
    userAddress: selectedAddress,
  });
  Alert.alert(
    strings('wallet.collectible_removed_title'),
    strings('wallet.collectible_removed_desc'),
  );
};
