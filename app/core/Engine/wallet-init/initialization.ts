import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import { isDmkEnabled, setDmkEnabled } from '../../Ledger/dmk';
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
  // DMK stack selection. Read the ledgerDmk flag from the persisted
  // RemoteFeatureFlagController state (LEDGER_FORCE_DMK env var overrides).
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
  // Latch the resolved value for the whole app session. The adapter factory
  // reads this latch (getDmkEnabled) instead of live Redux flags, so the
  // adapter choice can never diverge from the keyring-bridge choice made
  // below — a mismatch silently breaks all Ledger operations (the DMK
  // adapter's `updateSessionId` no-ops on the legacy bridge, and the legacy
  // adapter's `updateTransportMethod` no-ops on the DMK bridge).
  setDmkEnabled(useDmk);

  const wallet = new Wallet({
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
    },
  });

  setupRpcEndpointMetrics(messenger);

  wallet.init().catch((error) => console.error(error));

  return wallet;
}
