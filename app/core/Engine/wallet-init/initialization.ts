import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import type { RootState } from '../../../reducers';
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
 * @param request.getState - Returns the current Redux root state.
 * @param request.messenger - The root messenger.
 * @param request.state - The persisted controller state.
 * @returns The constructed `Wallet`.
 */
export function initializeWallet({
  getState,
  messenger,
  state,
}: {
  getState: () => RootState;
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
}) {
  const transactionControllerInitMessenger =
    getTransactionControllerInitMessenger(messenger);

  const wallet: Wallet = new Wallet({
    messenger,
    state,
    instanceOptions: {
      approvalController: getApprovalControllerInstanceOptions(),
      connectivityController: getConnectivityControllerInstanceOptions(),
      keyringController: getKeyringControllerInstanceOptions(messenger),
      networkController: getNetworkControllerInstanceOptions(),
      remoteFeatureFlagController:
        getRemoteFeatureFlagControllerInstanceOptions({
          messenger,
          state,
        }),
      storageService: getStorageServiceInstanceOptions(),
      transactionController: getTransactionControllerInstanceOptions({
        getState,
        getTransactionController: () =>
          wallet.getInstance('TransactionController'),
        initMessenger: transactionControllerInitMessenger,
      }),
    },
  });

  setupRpcEndpointMetrics(messenger);
  setupTransactionControllerListeners({
    getState,
    messenger: transactionControllerInitMessenger,
  });

  wallet.init().catch((error: unknown) => console.error(error));

  return wallet;
}
