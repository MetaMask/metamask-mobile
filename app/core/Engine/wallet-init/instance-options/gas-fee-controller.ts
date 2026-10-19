import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { WalletOptions } from '@metamask/wallet';

import AppConstants from '../../../AppConstants';
import { getGlobalChainId } from '../../../../util/networks/global-network';
import { isMainnetByChainId } from '../../../../util/networks';

type GasFeeControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['gasFeeController']
>;

const LEGACY_GAS_API_ENDPOINT =
  'https://gas.api.cx.metamask.io/networks/<chain_id>/gasPrices';
const EIP1559_API_ENDPOINT =
  'https://gas.api.cx.metamask.io/networks/<chain_id>/suggestedGasFees';

/**
 * Build the client-specific `GasFeeController` options for the
 * `@metamask/wallet` `Wallet`. The wallet owns the controller messenger,
 * persisted state, and the `NetworkController`-derived `getProvider` /
 * `getCurrentNetworkEIP1559Compatibility` callbacks, so those are excluded here.
 *
 * @returns The GasFeeController instance options.
 */
export function getGasFeeControllerInstanceOptions(): GasFeeControllerInstanceOptions {
  return {
    clientId: AppConstants.SWAPS.CLIENT_ID,
    EIP1559APIEndpoint: EIP1559_API_ENDPOINT,
    legacyAPIEndpoint: LEGACY_GAS_API_ENDPOINT,
    getCurrentNetworkLegacyGasAPICompatibility: () => {
      const chainId = getGlobalChainId();
      return (
        isMainnetByChainId(chainId) ||
        chainId === CHAIN_IDS.BSC ||
        chainId === CHAIN_IDS.POLYGON
      );
    },
  };
}
