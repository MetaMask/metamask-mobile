import { Wallet } from '@metamask/wallet';
import { Json } from '@metamask/utils';
import { RootMessenger } from '../types';
import { getApprovalControllerInstanceOptions } from './instance-options/approval-controller';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getConnectivityControllerInstanceOptions } from './instance-options/connectivity-controller';
import { getStorageServiceInstanceOptions } from './instance-options/storage-service';

/**
 * Construct the `@metamask/wallet` `Wallet` for mobile. Each controller's
 * client-specific options live in its own builder under `./instance-options/`.
 */
export function initializeWallet({
  messenger,
  state,
}: {
  messenger: RootMessenger;
  state: Record<string, Record<string, Json> | undefined>;
}) {
  return new Wallet({
    messenger,
    state,
    instanceOptions: {
      approvalController: getApprovalControllerInstanceOptions(),
      keyringController: getKeyringControllerInstanceOptions(messenger),
      remoteFeatureFlagController:
        getRemoteFeatureFlagControllerInstanceOptions({
          messenger,
          state,
        }),
      connectivityController: getConnectivityControllerInstanceOptions(),
      storageService: getStorageServiceInstanceOptions(),
    },
  });
}
