import { CaipChainId, SolScope } from '@metamask/keyring-api';
import AppConstants from '../../../../core/AppConstants';
import { CaipAssetType, Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const ALLOWED_CHAIN_IDS: (Hex | CaipChainId)[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.BSC,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.ZKSYNC_ERA,
  CHAIN_IDS.BASE,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.AVALANCHE,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.SEI,
  CHAIN_IDS.MONAD,
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
