import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import { resolveDmkEnabledFromState } from '../../Ledger/dmk';
import { getApprovalControllerInstanceOptions } from './instance-options/approval-controller';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getConnectivityControllerInstanceOptions } from './instance-options/connectivity-controller';
import { getStorageServiceInstanceOptions } from './instance-options/storage-service';
import {
  getNetworkControllerInstanceOptions,
  setupRpcEndpointMetrics,
} from './instance-options/network-controller';

/**
 * Construct the `@metamask/wallet` `Wallet` for mobile. Each controller's
 * client-specific options live in its own builder under `./instance-options/`.
 */
export function initializeWallet({
  messenger,
  state,
}: {
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
}) {
  // Resolve the DMK feature flag from the persisted wallet state before
  // constructing any controller options that depend on it.
  resolveDmkEnabledFromState(
    ((state as Record<string, unknown>)?.RemoteFeatureFlagController as
      | {
          remoteFeatureFlags?: Record<string, unknown>;
          localOverrides?: Record<string, unknown>;
        }
      | undefined) ?? {},
  );

  const wallet = new Wallet({
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
    },
  });

  setupRpcEndpointMetrics(messenger);

  wallet.init().catch((error) => console.error(error));

  return wallet;
}
