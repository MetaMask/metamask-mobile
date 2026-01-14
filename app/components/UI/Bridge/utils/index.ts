import { CaipChainId } from '@metamask/keyring-api';
import AppConstants from '../../../../core/AppConstants';
import { CaipAssetType, Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

export const isBridgeAllowed = (chainId: Hex | CaipChainId | string) => {
  if (!AppConstants.BRIDGE.ACTIVE) {
    return false;
  }

  return (
    ALLOWED_BRIDGE_CHAIN_IDS as readonly (Hex | CaipChainId | string)[]
  ).includes(chainId);
};

export const wipeBridgeStatus = (
  address: string,
  chainId: Hex | CaipChainId,
) => {
  Engine.context.BridgeStatusController.wipeBridgeStatus({
    address,
    ignoreNetwork: false,
  });
  // Solana addresses are case-sensitive, so we can only do this for EVM
  if (!isNonEvmChainId(chainId)) {
    Engine.context.BridgeStatusController.wipeBridgeStatus({
      address: address.toLowerCase(),
      ignoreNetwork: false,
    });
  }
};

export const getTokenIconUrl = (
  assetId: CaipAssetType | undefined,
  isNonEvmChain: boolean,
) => {
  if (!assetId) {
    return undefined;
  }
  const formattedAddress = isNonEvmChain ? assetId : assetId.toLowerCase();
  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${formattedAddress
    .split(':')
    .join('/')}.png`;
};
