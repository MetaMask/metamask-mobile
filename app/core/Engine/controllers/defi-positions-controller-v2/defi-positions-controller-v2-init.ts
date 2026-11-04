import {
  DeFiPositionsControllerV2,
  DeFiPositionsControllerV2Messenger,
} from '@metamask/assets-controllers';
import { createApiPlatformClient } from '@metamask/core-backend';
import { getVersion } from 'react-native-device-info';
import {
  getBackendApiUrlsOption,
  isBackendAuthDisabled,
} from '../../../coreBackendApiUrls';
import type { MessengerClientInitFunction } from '../../types';
import { DeFiPositionsControllerV2InitMessenger } from '../../messengers/defi-positions-controller-v2-messenger/defi-positions-controller-v2-messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';
import { selectDefiControllerV2Enabled } from '../../../../selectors/featureFlagController/defiControllerV2';

/**
 * The `ApiPlatformClient` type as expected by `DeFiPositionsControllerV2`.
 *
 * `@metamask/assets-controllers` resolves its own copy of
 * `@metamask/core-backend`, so the client we build here is structurally
 * identical but nominally incompatible (private `#` fields). Deriving the type
 * from the constructor keeps the cast anchored to whatever the package expects,
 * matching the approach used for `queryApiClient` in `assets-controller-init`.
 */
type DeFiPositionsApiClient = ConstructorParameters<
  typeof DeFiPositionsControllerV2
>[0]['apiClient'];

/**
 * Cached API client instance shared across init calls (matches AssetsController).
 */
let apiClient: DeFiPositionsApiClient | null = null;

/**
 * Safely retrieves the bearer token for API authentication.
 *
 * @param initMessenger - The initialization messenger.
 * @returns The bearer token or undefined if retrieval fails.
 */
async function safeGetBearerToken(
  initMessenger: DeFiPositionsControllerV2InitMessenger,
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
 * Gets or creates the API platform client used to fetch DeFi positions.
 *
 * @param initMessenger - The initialization messenger.
 * @returns The API platform client.
 */
function getApiClient(
  initMessenger: DeFiPositionsControllerV2InitMessenger,
): DeFiPositionsApiClient {
  apiClient ??= createApiPlatformClient({
    clientProduct: 'metamask-mobile',
    clientVersion: getVersion(),
    getBearerToken: () => safeGetBearerToken(initMessenger),
    ...getBackendApiUrlsOption(),
  }) as unknown as DeFiPositionsApiClient;

  return apiClient;
}

/**
 * Initialize the DeFiPositionsControllerV2.
 *
 * @param request - The request object.
 * @returns The DeFiPositionsControllerV2.
 */
export const defiPositionsControllerV2Init: MessengerClientInitFunction<
  DeFiPositionsControllerV2,
  DeFiPositionsControllerV2Messenger,
  DeFiPositionsControllerV2InitMessenger
> = (request) => {
  const { initMessenger, controllerMessenger } = request;

  const controller = new DeFiPositionsControllerV2({
    messenger: controllerMessenger,
    apiClient: getApiClient(initMessenger),
    isEnabled: () =>
      selectBasicFunctionalityEnabled(store.getState()) &&
      selectCompletedOnboarding(store.getState()) &&
      selectDefiControllerV2Enabled(store.getState()),
    getVsCurrency: () =>
      initMessenger.call('AssetsController:getState').selectedCurrency,
  });

  return { controller };
};
