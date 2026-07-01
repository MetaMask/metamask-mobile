import { getCapabilities } from '@metamask/eip-5792-middleware';
import { ALLOWED_BRIDGE_CHAIN_IDS } from '@metamask/bridge-controller';
import type { Hex, Json } from '@metamask/utils';

import Engine from '../Engine';
import { store } from '../../store';
import { selectSmartTransactionsEnabled } from '../../selectors/smartTransactionsController';
import { isRelaySupported } from '../../util/transactions/transaction-relay';

/**
 * Builds the hooks object consumed by `@metamask/eip-5792-middleware`'s
 * `getCapabilities`. Shared between the EIP-5792 RPC middleware and the
 * multichain session `getCapabilities` hook so both compute capabilities
 * identically.
 *
 * @returns The getCapabilities hooks.
 */
export function buildGetCapabilitiesHooks() {
  return {
    getDismissSmartAccountSuggestionEnabled: () =>
      Engine.context.PreferencesController.state
        .dismissSmartAccountSuggestionEnabled,
    getIsSmartTransaction: (chainId: Hex) =>
      selectSmartTransactionsEnabled(store.getState(), chainId),
    isAtomicBatchSupported:
      Engine.context.TransactionController.isAtomicBatchSupported.bind(
        Engine.context.TransactionController,
      ),
    isRelaySupported,
    getSendBundleSupportedChains: async (chainIds: Hex[]) => {
      const isAtomicBatchSupportedResult =
        await Engine.context.TransactionController.isAtomicBatchSupported({
          address: Engine.context.AccountsController.getSelectedAccount()
            .address as Hex,
          chainIds,
        });
      return isAtomicBatchSupportedResult.reduce(
        (acc: Record<Hex, boolean>, { chainId, isSupported }) => ({
          ...acc,
          [chainId]: isSupported,
        }),
        {},
      );
    },
    isAuxiliaryFundsSupported: (chainId: Hex) =>
      ALLOWED_BRIDGE_CHAIN_IDS.includes(chainId),
  };
}

/**
 * Computes EIP-5792 capabilities for a single address across all configured
 * chains. Matches the multichain session `getCapabilities` hook signature so it
 * can hydrate `sessionProperties.eip155Capabilities` on `wallet_createSession`,
 * `wallet_getSession`, and `wallet_sessionChanged`.
 *
 * @param address - The EVM address to compute capabilities for.
 * @returns Per-chain capabilities keyed by chain ID.
 */
export function getSessionCapabilities(
  address: string,
): Promise<Record<Hex, Record<string, Json>>> {
  return getCapabilities(
    buildGetCapabilitiesHooks(),
    Engine.controllerMessenger,
    address as Hex,
    undefined,
  );
}
