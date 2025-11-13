import { CaipChainId, SolScope } from '@metamask/keyring-api';
import AppConstants from '../../../../core/AppConstants';
import { Hex } from '@metamask/utils';
import {
  ARBITRUM_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  ETH_CHAIN_ID,
  LINEA_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
  SEI_CHAIN_ID,
} from '@metamask/swaps-controller/dist/constants';
import Engine from '../../../../core/Engine';
import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

const ALLOWED_CHAIN_IDS: (Hex | CaipChainId)[] = [
  ETH_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
  BASE_CHAIN_ID,
  ARBITRUM_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  LINEA_CHAIN_ID,
  SEI_CHAIN_ID,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  SolScope.Mainnet,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
];

export const isBridgeAllowed = (chainId: Hex | CaipChainId) => {
  if (!AppConstants.BRIDGE.ACTIVE) {
    return false;
  }
  return ALLOWED_CHAIN_IDS.includes(chainId);
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
  address: string,
  chainId: Hex | CaipChainId,
) => {
  const isEvmChain = !isNonEvmChainId(chainId);
  const formattedAddress = isEvmChain ? address.toLowerCase() : address;

  try {
    const assetId = formatAddressToAssetId(formattedAddress, chainId);
    if (!assetId) {
      return undefined;
    }
    return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${assetId
      .split(':')
      .join('/')}.png`;
  } catch (error) {
    // formatAddressToAssetId may throw for unsupported chains. This is expected behavior,
    // so we gracefully handle it by returning undefined rather than propagating the error.
    // This prevents the app from crashing when attempting to fetch icons for tokens on
    // chains that aren't yet supported by the tokenIcons API.
    return undefined;
  }
};
