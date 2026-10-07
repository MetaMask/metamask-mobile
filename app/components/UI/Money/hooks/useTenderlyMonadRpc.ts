import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectMoneyMovementBrazilNeobankEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  MONAD_CHAIN_ID,
  resolveMonadRpcConfig,
  shouldUseTenderlyMonadRpc,
  tenderlyMonadRpcUrl,
} from '../../../../core/Engine/controllers/network-controller/tenderly-monad-rpc';
import Logger from '../../../../util/Logger';

/**
 * Points Monad at the Tenderly fork for dev builds in the neobank cohort,
 * and removes that endpoint when either gate is off.
 */
export function useTenderlyMonadRpc(): void {
  const neobankEnabled = useSelector(selectMoneyMovementBrazilNeobankEnabled);
  const networks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const monad = networks?.[MONAD_CHAIN_ID];

  useEffect(() => {
    if (!monad) {
      return;
    }

    const tenderlyRpcUrl = tenderlyMonadRpcUrl();
    const next = resolveMonadRpcConfig({
      enabled: shouldUseTenderlyMonadRpc(neobankEnabled),
      tenderlyRpcUrl,
      rpcEndpoints: monad.rpcEndpoints,
      defaultRpcEndpointIndex: monad.defaultRpcEndpointIndex,
    });
    if (!next) {
      return;
    }

    Engine.context.NetworkController.updateNetwork(
      MONAD_CHAIN_ID,
      {
        blockExplorerUrls: monad.blockExplorerUrls,
        chainId: MONAD_CHAIN_ID,
        defaultBlockExplorerUrlIndex: monad.defaultBlockExplorerUrlIndex,
        defaultRpcEndpointIndex: next.defaultRpcEndpointIndex,
        name: monad.name,
        nativeCurrency: monad.nativeCurrency,
        rpcEndpoints: next.rpcEndpoints,
      },
      {
        replacementSelectedRpcEndpointIndex: next.defaultRpcEndpointIndex,
      },
    ).catch((error: unknown) => {
      Logger.error(error as Error, 'Failed to apply Tenderly Monad RPC');
    });
  }, [monad, neobankEnabled]);
}
