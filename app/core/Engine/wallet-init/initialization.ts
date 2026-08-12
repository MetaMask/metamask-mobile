import { Wallet, type WalletOptions } from '@metamask/wallet';
import { type Json, isObject } from '@metamask/utils';
import { RootMessenger } from '../types';
import { getDefaultFeatureFlags } from '../../../constants/featureFlags';
import { getApprovalControllerInstanceOptions } from './instance-options/approval-controller';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getConnectivityControllerInstanceOptions } from './instance-options/connectivity-controller';
import { getGasFeeControllerInstanceOptions } from './instance-options/gas-fee-controller';
import { getSeedlessOnboardingControllerInstanceOptions } from './instance-options/seedless-onboarding-controller';
import { getStorageServiceInstanceOptions } from './instance-options/storage-service';
import { getNetworkControllerInstanceOptions } from './instance-options/network-controller';
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
 * @param request.id - Stable anonymous id, reserved for future
 * ID-based A/B bucketing of default feature flags.
 * @returns The constructed `Wallet`.
 */
export function initializeWallet({
  messenger,
  state,
  id,
}: {
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
  id?: string;
}) {
  const transactionControllerInitMessenger =
    getTransactionControllerInitMessenger(messenger);

  // Seed client-side feature-flag defaults UNDER any persisted flags so
  // persisted/fetched server values win. This covers the pre-fetch window;
  // durability across fetches is handled by the ClientConfigApiService wrapper
  // in `instance-options/remote-feature-flag-controller.ts`.
  const persistedRemoteFeatureFlagState = state.RemoteFeatureFlagController;
  const persistedRemoteFeatureFlags =
    persistedRemoteFeatureFlagState?.remoteFeatureFlags;
  const seededState: NonNullable<WalletOptions['state']> = {
    ...state,
    RemoteFeatureFlagController: {
      ...persistedRemoteFeatureFlagState,
      remoteFeatureFlags: {
        ...getDefaultFeatureFlags({ id }),
        ...(isObject(persistedRemoteFeatureFlags)
          ? (persistedRemoteFeatureFlags as Record<string, Json>)
          : {}),
      },
    },
  };

  const wallet: Wallet = new Wallet({
    // Mobile's root messenger carries a superset action/event union (all app
    // controllers) vs. the wallet's narrower DefaultActions/DefaultEvents.
    // `Messenger` isn't covariant in those params, so the superset messenger
    // isn't assignable to the wallet's type despite being the same runtime
    // 'Root' bus that already carries everything Wallet needs.
    messenger: messenger as NonNullable<WalletOptions['messenger']>,
    state: seededState,
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

  setupTransactionControllerListeners({
    messenger: transactionControllerInitMessenger,
  });

  wallet.init().catch((error: unknown) => console.error(error));

  return wallet;
}
