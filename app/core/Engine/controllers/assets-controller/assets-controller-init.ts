import { createApiPlatformClient } from '@metamask/core-backend';
import { getVersion } from 'react-native-device-info';
import {
  getBackendApiUrlsOption,
  isBackendAuthDisabled,
} from '../../../coreBackendApiUrls';
import {
  AssetsController,
  AssetsControllerMessenger,
  type AssetsControllerOptions,
} from '@metamask/assets-controller';
import type { MessengerClientInitFunction } from '../../types';
import { type AssetsControllerInitMessenger } from '../../messengers/assets-controller';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { store } from '../../../../store';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

type QueryApiClient = AssetsControllerOptions['queryApiClient'];

/**
 * Cached API client instance.
 */
let apiClient: QueryApiClient | null = null;

/**
 * Safely retrieves the bearer token for API authentication.
 *
 * @param initMessenger - The initialization messenger.
 * @returns The bearer token or undefined if retrieval fails.
 */
async function safeGetBearerToken(
  initMessenger: AssetsControllerInitMessenger,
): Promise<string | undefined> {
  if (isBackendAuthDisabled()) {
    return undefined;
  }
  try {
    return await initMessenger.call('AuthenticationController:getBearerToken');
  } catch {
    return undefined;
  }
}

/**
 * Safely retrieves the token detection preference.
 *
 * @param initMessenger - The initialization messenger.
 * @returns Whether token detection is enabled (defaults to true on error).
 */
function safeGetTokenDetectionEnabled(
  initMessenger: AssetsControllerInitMessenger,
): boolean {
  try {
    const preferencesState = initMessenger.call(
      'PreferencesController:getState',
    );
    return preferencesState?.useTokenDetection ?? true;
  } catch {
    return true;
  }
}

/**
 * Reads the Basic functionality setting from Redux.
 *
 * @returns True when external services are allowed.
 */
function isBasicFunctionality(): boolean {
  return selectBasicFunctionalityEnabled(store.getState());
}

/**
 * Subscribes to Redux changes of the Basic functionality setting.
 * Mobile stores the setting in `settings.basicFunctionalityEnabled`, so the
 * controller is notified through the store. The returned unsubscribe is called
 * when the controller is destroyed.
 *
 * @param onChange - Called with the new value when the setting changes.
 * @returns Unsubscribe function.
 */
function subscribeToBasicFunctionalityChange(
  onChange: (isBasic: boolean) => void,
): () => void {
  let previousBasicFunctionalityEnabled = isBasicFunctionality();

  return store.subscribe(() => {
    const currentBasicFunctionalityEnabled = isBasicFunctionality();
    if (
      currentBasicFunctionalityEnabled === previousBasicFunctionalityEnabled
    ) {
      return;
    }

    previousBasicFunctionalityEnabled = currentBasicFunctionalityEnabled;
    onChange(currentBasicFunctionalityEnabled);
  });
}

/**
 * Gets or creates the API platform client.
 *
 * @param initMessenger - The initialization messenger.
 * @returns The API platform client.
 */
function getApiClient(
  initMessenger: AssetsControllerInitMessenger,
): QueryApiClient {
  if (!apiClient) {
    apiClient = createApiPlatformClient({
      clientProduct: 'metamask-mobile',
      clientVersion: getVersion(),
      getBearerToken: () => safeGetBearerToken(initMessenger),
      ...getBackendApiUrlsOption(),
    });
  }
  return apiClient;
}

/**
 * Init function for the AssetsController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @param request.initMessenger - The init messenger to use for the controller.
 * @returns The initialized controller.
 */
export const assetsControllerInit: MessengerClientInitFunction<
  AssetsController,
  AssetsControllerMessenger,
  AssetsControllerInitMessenger
> = ({ controllerMessenger, persistedState, initMessenger }) => {
  /**
   * The controller only runs while the wallet is unlocked.
   *
   * @returns True if the controller is enabled.
   */
  const isEnabled = (): boolean => selectIsUnlocked(store.getState());

  // Create the controller - it now creates all data sources internally
  const controller = new AssetsController({
    messenger: controllerMessenger,
    state: persistedState?.AssetsController,
    isBasicFunctionality,
    subscribeToBasicFunctionalityChange,
    isEnabled,
    queryApiClient: getApiClient(initMessenger),
    rpcDataSourceConfig: {
      tokenDetectionEnabled: () => safeGetTokenDetectionEnabled(initMessenger),
      balanceInterval: 30_000,
      detectionInterval: 180_000,
    },
    priceDataSourceConfig: {
      pollInterval: 180_000,
    },
    stakedBalanceDataSourceConfig: {
      pollInterval: 30_000,
      enabled: true,
    },
    isOnboarded: () => selectCompletedOnboarding(store.getState()),
    // TEMPORARY (ASSETS-3346): legacy state slices used to heal wiped `assetsInfo` metadata.
    tempMigrateAssetsInfoMetadataAssets3346: () => ({
      TokensController: persistedState?.TokensController,
      AccountsController: persistedState?.AccountsController,
    }),
  });

  return { controller };
};
