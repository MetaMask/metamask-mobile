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
 * Points Monad at the Tenderly fork. Call only after both gates have passed.
 */
function useTenderlyMonadRpc(): void {
  const networks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const monad = networks?.[MONAD_CHAIN_ID];

  useEffect(() => {
    if (!monad) {
      return;
    }

    const tenderlyRpcUrl = tenderlyMonadRpcUrl();
    const next = resolveMonadRpcConfig({
      enabled: true,
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
  }, [monad]);
}

/**
 * Mounted only for a dev build. The network update runs only while
 * `moneyMovementBrazilNeobank` is on.
 */
export function TenderlyMonadRpc(): null {
  const neobankEnabled = useSelector(selectMoneyMovementBrazilNeobankEnabled);
  if (!shouldUseTenderlyMonadRpc(neobankEnabled)) {
    return null;
  }
  return <TenderlyMonadRpcApply />;
}

function TenderlyMonadRpcApply(): null {
  useTenderlyMonadRpc();
  return null;
}
