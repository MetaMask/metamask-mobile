import { Wallet, type WalletOptions } from '@metamask/wallet';
import { RootMessenger } from '../types';
import { initializeLedgerDmkMode } from '../../Ledger/dmk';
import Logger from '../../../util/Logger';
import { setupAnalyticsControllerEffects } from '../controllers/analytics-controller/setup-analytics-effects';
import { getAnalyticsControllerInitMessenger } from '../messengers/analytics-controller-messenger';
import { getAnalyticsControllerInstanceOptions } from './instance-options/analytics-controller';
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

/**
 * Construct the `@metamask/wallet` `Wallet` for mobile. Each controller's
 * client-specific options live in its own builder under `./instance-options/`.
 *
 * @param request - The wallet initialization request.
 * @param request.messenger - The root messenger.
 * @param request.state - The persisted controller state.
 * @param request.analyticsId - MMKV analytics id. Stamped onto persisted
 * AnalyticsController state because wallet 19 keeps a non-empty persisted id.
 * @returns The constructed `Wallet`.
 */
export function initializeWallet({
  messenger,
  state,
  analyticsId,
}: {
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
  analyticsId: string;
}) {
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
    state: withAuthoritativeAnalyticsId(state, analyticsId),
    instanceOptions: {
      analyticsController: getAnalyticsControllerInstanceOptions(analyticsId),
      approvalController: getApprovalControllerInstanceOptions(),
      connectivityController: getConnectivityControllerInstanceOptions(),
      gasFeeController: getGasFeeControllerInstanceOptions(),
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

  setupAnalyticsControllerEffects(
    getAnalyticsControllerInitMessenger(messenger),
  );

  wallet
    .init()
    .then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          Logger.error(
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
            'initializeWallet: controller init failed',
          );
        }
      }
    })
    .catch((error: unknown) => {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'initializeWallet: wallet init failed',
      );
    });

  return wallet;
}

/**
 * Wallet 19 uses a non-empty persisted `analyticsId` ahead of
 * `instanceOptions.analyticsController.analyticsId`. Mobile's identity source
 * is the MMKV id, so that id is written onto the state blob the wallet reads.
 *
 * @param state - Persisted wallet state.
 * @param analyticsId - MMKV analytics id.
 * @returns State whose AnalyticsController id is the MMKV id.
 */
function withAuthoritativeAnalyticsId(
  state: NonNullable<WalletOptions['state']>,
  analyticsId: string,
): NonNullable<WalletOptions['state']> {
  return {
    ...state,
    AnalyticsController: {
      ...state.AnalyticsController,
      analyticsId,
    },
  };
}
