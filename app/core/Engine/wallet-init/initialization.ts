import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import { initializeLedgerDmkMode } from '../../Ledger/dmk';
import Logger from '../../../util/Logger';
import { getApprovalControllerInstanceOptions } from './instance-options/approval-controller';
import { getKeyringControllerInstanceOptions } from './instance-options/keyring-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './instance-options/remote-feature-flag-controller';
import { getConnectivityControllerInstanceOptions } from './instance-options/connectivity-controller';
import { getGasFeeControllerInstanceOptions } from './instance-options/gas-fee-controller';
import { getSeedlessOnboardingControllerInstanceOptions } from './instance-options/seedless-onboarding-controller';
import { getStorageServiceInstanceOptions } from './instance-options/storage-service';
import { getSubscriptionServiceInstanceOptions } from './instance-options/subscription-service';
import { getShieldApiServiceInstanceOptions } from './instance-options/shield-api-service';
import { getClaimsServiceInstanceOptions } from './instance-options/claims-service';
import { getConfigRegistryApiServiceInstanceOptions } from './instance-options/config-registry-api-service';
import { getNetworkControllerInstanceOptions } from './instance-options/network-controller';
import {
  getTransactionControllerInstanceOptions,
  setupTransactionControllerListeners,
} from './instance-options/transaction-controller';
import { getTransactionControllerInitMessenger } from './messengers/transaction-controller-messenger';
import { getPermissionControllerInstanceOptions } from './instance-options/permission-controller';
import { getPermissionControllerInitMessenger } from './messengers/permission-controller-messenger';
import DomainProxyMap from '../../../lib/DomainProxyMap/DomainProxyMap';
import {
  getAnalyticsControllerInstanceOptions,
  withMobileAnalyticsControllerState,
} from './instance-options/analytics-controller';
import { getAnalyticsControllerInitMessenger } from './messengers/analytics-controller-messenger';
import { setupAnalyticsControllerListeners } from './listeners/analytics-controller';
import { getGeolocationApiServiceInstanceOptions } from './instance-options/geolocation-api-service';
import { fetchInitialGeolocation } from './listeners/geolocation-controller';

/**
 * Construct the `@metamask/wallet` `Wallet` for mobile. Each controller's
 * client-specific options live in its own builder under `./instance-options/`.
 *
 * @param request - The wallet initialization request.
 * @param request.messenger - The root messenger.
 * @param request.state - The persisted controller state.
 * @param request.analyticsId - The analytics ID read from MMKV.
 * @returns The constructed `Wallet`.
 */
export function initializeWallet({
  messenger,
  state: persistedState,
  analyticsId,
}: {
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
  analyticsId: string;
}) {
  const state = withMobileAnalyticsControllerState(persistedState, analyticsId);

  // Ledger DMK mode: seeded once here from persisted state; the keyring
  // bridge and adapter creation (`useAdapterLifecycle`) read this same value.
  const remoteFeatureFlagState = (state as Record<string, unknown>)
    ?.RemoteFeatureFlagController as
    | {
        remoteFeatureFlags?: Record<string, unknown>;
        localOverrides?: Record<string, unknown>;
      }
    | undefined;
  const useDmk = initializeLedgerDmkMode({
    ...(remoteFeatureFlagState?.remoteFeatureFlags ?? {}),
    ...(remoteFeatureFlagState?.localOverrides ?? {}),
  });

  Logger.log('Ledger mode:', {
    stack: useDmk ? 'dmk' : 'legacy',
  });

  const transactionControllerInitMessenger =
    getTransactionControllerInitMessenger(messenger);

  // TC event listeners must be set up before the wallet is initialized.
  // So that the TC can emit events to the wallet's messenger during initialization.
  setupTransactionControllerListeners({
    messenger: transactionControllerInitMessenger,
  });

  const wallet: Wallet = new Wallet({
    // Mobile's root messenger carries a superset action/event union (all app
    // controllers) vs. the wallet's narrower DefaultActions/DefaultEvents.
    // `Messenger` isn't covariant in those params, so the superset messenger
    // isn't assignable to the wallet's type despite being the same runtime
    // 'Root' bus that already carries everything Wallet needs.
    messenger: messenger as NonNullable<WalletOptions['messenger']>,
    state,
    instanceOptions: {
      analyticsController: getAnalyticsControllerInstanceOptions(analyticsId),
      approvalController: getApprovalControllerInstanceOptions(),
      connectivityController: getConnectivityControllerInstanceOptions(),
      gasFeeController: getGasFeeControllerInstanceOptions(),
      geolocationApiService: getGeolocationApiServiceInstanceOptions(),
      keyringController: getKeyringControllerInstanceOptions(messenger, useDmk),
      networkController: getNetworkControllerInstanceOptions(),
      permissionController: getPermissionControllerInstanceOptions(
        getPermissionControllerInitMessenger(messenger),
      ),
      remoteFeatureFlagController:
        getRemoteFeatureFlagControllerInstanceOptions({
          messenger,
          state,
        }),
      seedlessOnboardingController:
        getSeedlessOnboardingControllerInstanceOptions(),
      selectedNetworkController: {
        domainProxyMap: new DomainProxyMap(),
      },
      storageService: getStorageServiceInstanceOptions(),
      subscriptionService: getSubscriptionServiceInstanceOptions(),
      shieldApiService: getShieldApiServiceInstanceOptions(),
      claimsService: getClaimsServiceInstanceOptions(),
      configRegistryApiService: getConfigRegistryApiServiceInstanceOptions(),
      transactionController: getTransactionControllerInstanceOptions({
        initMessenger: transactionControllerInitMessenger,
      }),
    },
  });

  setupAnalyticsControllerListeners(
    getAnalyticsControllerInitMessenger(messenger),
  );

  // `wallet.init()` also runs `NetworkEnablementController.init()`, which
  // reads `MultichainNetworkController:getState`. Mobile registers that
  // controller after the wallet, so Engine calls
  // `NetworkEnablementController.init()` again once it exists.
  wallet.init().catch((error: unknown) => console.error(error));

  fetchInitialGeolocation(wallet.getInstance('GeolocationController'));

  return wallet;
}
