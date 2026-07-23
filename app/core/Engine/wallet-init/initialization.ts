import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import { getApprovalControllerInstanceOptions } from './instance-options/approval-controller';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getConnectivityControllerInstanceOptions } from './instance-options/connectivity-controller';
import { getGasFeeControllerInstanceOptions } from './instance-options/gas-fee-controller';
import { getSeedlessOnboardingControllerInstanceOptions } from './instance-options/seedless-onboarding-controller';
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
  const transactionControllerInitMessenger =
    getTransactionControllerInitMessenger(messenger);

  const wallet: Wallet = new Wallet({
    // Mobile RootMessenger carries app-wide actions; Wallet only types its
    // default-controller action set. Runtime parentage is the same messenger.
    messenger: messenger as NonNullable<WalletOptions['messenger']>,
    state,
    instanceOptions: {
      approvalController: getApprovalControllerInstanceOptions(),
      connectivityController: getConnectivityControllerInstanceOptions(),
      gasFeeController: getGasFeeControllerInstanceOptions(),
      keyringController: getKeyringControllerInstanceOptions(messenger),
      networkController: getNetworkControllerInstanceOptions(),
      remoteFeatureFlagController:
        getRemoteFeatureFlagControllerInstanceOptions({
          messenger,
          state,
        }),
      seedlessOnboardingController:
        getSeedlessOnboardingControllerInstanceOptions(),
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
