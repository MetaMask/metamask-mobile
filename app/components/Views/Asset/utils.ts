///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
import { selectIsBridgeEnabledSource } from '../../../core/redux/slices/bridge';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import {
  swapsLivenessMultichainSelector,
  swapsLivenessSelector,
} from '../../../reducers/swaps';
import { isAssetFromSearch } from '../../../selectors/tokenSearchDiscoveryDataController';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { Hex, CaipChainId } from '@metamask/utils';
import { RootState } from '../../../reducers';

export const getSwapsIsLive = (
  state: RootState,
  chainId: Hex | CaipChainId,
) => {
  const evmSwapsIsLive = isPortfolioViewEnabled()
    ? // @ts-expect-error issues with the type, it should have 2 args
      swapsLivenessMultichainSelector(state, chainId)
    : swapsLivenessSelector(state);
  let swapsIsLive = evmSwapsIsLive;

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (chainId === SolScope.Mainnet) {
    const solanaSwapsIsLive = selectIsBridgeEnabledSource(state, chainId);
    swapsIsLive = solanaSwapsIsLive;
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  return swapsIsLive;
};

export const getIsSwapsAssetAllowed = ({
  asset,
  searchDiscoverySwapsTokens,
  swapsTokens,
}: {
  asset: {
    isETH: boolean;
    isNative: boolean;
    address: string;
    chainId: string;
    isFromSearch?: boolean;
  };
  searchDiscoverySwapsTokens: string[];
  swapsTokens: Record<string, unknown>;
}) => {
  // EVM Swaps
  let isEvmSwapsAssetAllowed;
  if (asset.isETH || asset.isNative) {
    isEvmSwapsAssetAllowed = true;
  } else if (isAssetFromSearch(asset)) {
    isEvmSwapsAssetAllowed = searchDiscoverySwapsTokens?.includes(
      asset.address?.toLowerCase(),
    );
  } else {
    isEvmSwapsAssetAllowed = asset.address?.toLowerCase() in swapsTokens;
  }
  let isSwapsAssetAllowed = isEvmSwapsAssetAllowed;

  // Solana Swaps
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.chainId === SolScope.Mainnet) {
    isSwapsAssetAllowed = true;
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  return isSwapsAssetAllowed;
};
