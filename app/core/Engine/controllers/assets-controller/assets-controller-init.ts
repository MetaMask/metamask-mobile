import { createApiPlatformClient } from '@metamask/core-backend';
import { getVersion } from 'react-native-device-info';
import {
  AssetsController,
  AssetsControllerMessenger,
  type AssetsControllerOptions,
} from '@metamask/assets-controller';
import type {
  TraceCallback as ControllerTraceCallback,
  TraceContext as ControllerTraceContext,
  TraceRequest as ControllerTraceRequest,
} from '@metamask/controller-utils';
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
    });
  }
  return apiClient;
}

/**
 * Trace callback for AssetsController. Sentry tracing for this controller is
 * currently disabled by default (matching the last-known remote config), so
 * `fn` (if provided) is run without creating a Sentry span.
 *
 * @returns A {@link ControllerTraceCallback} suitable for AssetsController.
 */
function createAssetsControllerTrace(): ControllerTraceCallback {
  return <Result>(
    _req: ControllerTraceRequest,
    fn?: (ctx?: ControllerTraceContext) => Result,
  ): Promise<Result> => Promise.resolve(fn?.() as Result);
}

/**
 * Init function for the AssetsController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @param request.initMessenger - The init messenger to use for the controller.
 * @param request.getMessengerClient - Function to get a controller by name.
 * @returns The initialized controller.
 */
export const assetsControllerInit: MessengerClientInitFunction<
  AssetsController,
  AssetsControllerMessenger,
  AssetsControllerInitMessenger
> = ({
  controllerMessenger,
  persistedState,
  initMessenger,
  getMessengerClient: _getController,
}) => {
  /**
   * Check if the AssetsController feature is enabled. AssetsController is
   * the sole source of truth for asset data (the legacy per-asset
   * controllers have been removed), so this now only requires the wallet
   * to be unlocked.
   *
   * @returns True if the feature is enabled, false otherwise.
   */
  const isEnabled = (): boolean => selectIsUnlocked(store.getState());

  // Create the controller - it now creates all data sources internally
  const controller = new AssetsController({
    messenger: controllerMessenger,
    state: persistedState?.AssetsController,
    isBasicFunctionality: () =>
      selectBasicFunctionalityEnabled(store.getState()),
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
    trace: createAssetsControllerTrace(),
    // TEMPORARY (ASSETS-3346): legacy state slices used to heal wiped `assetsInfo` metadata.
    // TokensController has been removed; only AccountsController remains available.
    tempMigrateAssetsInfoMetadataAssets3346: () => ({
      AccountsController: persistedState?.AccountsController,
    }),
  });

  return { controller };
};
