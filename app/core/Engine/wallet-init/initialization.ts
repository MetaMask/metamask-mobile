import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import { isDmkEnabled } from '../../Ledger/dmk';
import { getApprovalControllerInstanceOptions } from './instance-options/approval-controller';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getConnectivityControllerInstanceOptions } from './instance-options/connectivity-controller';
import { getStorageServiceInstanceOptions } from './instance-options/storage-service';
import {
  getNetworkControllerInstanceOptions,
  setupRpcEndpointMetrics,
} from './instance-options/network-controller';
import {
  getTransactionControllerInstanceOptions,
  setupTransactionControllerListeners,
} from './instance-options/transaction-controller';
import { getTransactionControllerInitMessenger } from './messengers/transaction-controller-messenger';

/**
 * Construct the `@metamask/wallet` `Wallet` for mobile. Each controller's
 * client-specific options live in its own builder under `./instance-options/`.
 *
 * @param request - The wallet initialization request.
 * @param request.messenger - The root messenger.
 * @param request.state - The persisted controller state.
 * @returns The constructed `Wallet`.
 */
export function initializeWallet({
  messenger,
  state,
}: {
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
}) {
  // DMK stack selection. Read the ledgerDmk flag fresh from the persisted
  // RemoteFeatureFlagController state (LEDGER_FORCE_DMK env var overrides).
  // No caching — the adapter factory reads the same flag from live state.
  const remoteFeatureFlagState = (state as Record<string, unknown>)
    ?.RemoteFeatureFlagController as
    | {
        remoteFeatureFlags?: Record<string, unknown>;
        localOverrides?: Record<string, unknown>;
      }
    | undefined;
  const useDmk = isDmkEnabled({
    ...(remoteFeatureFlagState?.remoteFeatureFlags ?? {}),
    ...(remoteFeatureFlagState?.localOverrides ?? {}),
  });

  const transactionControllerInitMessenger =
    getTransactionControllerInitMessenger(messenger);

  const wallet: Wallet = new Wallet({
    messenger,
    state,
    instanceOptions: {
      approvalController: getApprovalControllerInstanceOptions(),
      connectivityController: getConnectivityControllerInstanceOptions(),
      keyringController: getKeyringControllerInstanceOptions(messenger, useDmk),
      networkController: getNetworkControllerInstanceOptions(),
      remoteFeatureFlagController:
        getRemoteFeatureFlagControllerInstanceOptions({
          messenger,
          state,
        }),
      storageService: getStorageServiceInstanceOptions(),
      transactionController: getTransactionControllerInstanceOptions({
        initMessenger: transactionControllerInitMessenger,
      }),
    },
  });

  setupRpcEndpointMetrics(messenger);
  setupTransactionControllerListeners({
    messenger: transactionControllerInitMessenger,
  });

  wallet.init().catch((error: unknown) => console.error(error));

  return wallet;
}
