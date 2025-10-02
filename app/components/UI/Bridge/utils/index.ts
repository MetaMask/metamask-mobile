import {
  CaipChainId,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  SolScope,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
} from '@metamask/keyring-api';
import AppConstants from '../../../../core/AppConstants';
import { Hex, isCaipAssetType } from '@metamask/utils';
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
  isNativeAddress,
  isNonEvmChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { getNativeSourceToken } from '../hooks/useInitialSourceToken';

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
  if (!isSolanaChainId(chainId)) {
    Engine.context.BridgeStatusController.wipeBridgeStatus({
      address: address.toLowerCase(),
      ignoreNetwork: false,
    });
  }
};

/**
 * If the address is already in CAIP format, returns it as-is.
 * Otherwise, converts it to CAIP format using the provided chainId.
 */
export function normalizeToCaipAssetType(
  address: string,
  chainId: Hex | CaipChainId,
): string {
  if (isCaipAssetType(address)) {
    return address;
  }

  if (isNativeAddress(address)) {
    const nativeSourceToken = getNativeSourceToken(chainId);
    return nativeSourceToken.address;
  }

  // https://namespaces.chainagnostic.org/solana/caip19
  if (isSolanaChainId(chainId)) {
    return `${chainId}/token:${address}`;
  }

  // https://chainagnostic.org/CAIPs/caip-19
  const isEvmChainId = !isNonEvmChainId(chainId);
  if (isEvmChainId) {
    return `${chainId}/erc20:${address}`;
  }

  // This should cover currently supported chains, Bitcoin only has the native asset
  throw new Error(`Invalid chain ID: ${chainId}`);
}
