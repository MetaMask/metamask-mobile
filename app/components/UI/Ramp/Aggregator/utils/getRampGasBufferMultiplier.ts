import { Hex } from '@metamask/utils';
import { NetworkClientId } from '@metamask/network-controller';

import Engine from '../../../../../core/Engine';

interface GasBufferFlag {
  default?: number;
  included?: number;
  perChainConfig?: Record<
    string,
    {
      base?: number;
      included?: number;
    }
  >;
}

/**
 * Returns the gas buffer multiplier core applies to a confirmed transaction.
 * The Ramp sell reservation must not under-count it, or Max can be higher than
 * the balance can cover at confirmation.
 *
 * @param chainId - Network chain id in hex.
 * @param networkClientId - The network client the transaction will use.
 * @returns The buffer multiplier, defaulting to 1.
 */
export function getRampGasBufferMultiplier(
  chainId: Hex,
  networkClientId: NetworkClientId,
): number {
  // Replace with TransactionController.estimateGasBuffered's default buffer
  // once a core release ships it:
  // https://consensyssoftware.atlassian.net/browse/TRAM-4526
  // https://github.com/MetaMask/core/pull/11756
  // Until then this mirrors core's getGasEstimateBuffer from
  // @metamask/transaction-controller 74.2.0 and can drift if core changes the
  // flag schema or rules.
  const { NetworkController, RemoteFeatureFlagController } = Engine.context;

  const flags = RemoteFeatureFlagController.state.remoteFeatureFlags
    ?.confirmations_gas_buffer as GasBufferFlag | undefined;

  const chainFlags = flags?.perChainConfig?.[chainId];
  const networkClientType = (
    NetworkController.getNetworkClientById(networkClientId)
      .configuration as unknown as { type: string }
  ).type;
  const isCustomRpc = networkClientType === 'custom';

  const chainIncludedBuffer = isCustomRpc ? undefined : chainFlags?.included;
  const defaultIncludedBuffer = isCustomRpc ? undefined : flags?.included;

  return (
    chainIncludedBuffer ??
    chainFlags?.base ??
    defaultIncludedBuffer ??
    flags?.default ??
    1
  );
}
