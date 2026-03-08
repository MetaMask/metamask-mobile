import {
  ConfigRegistryController,
  type FetchConfigResult,
  type RegistryNetworkConfig,
} from '@metamask/config-registry-controller';
import type { ControllerInitFunction, ControllerInitRequest } from '../types';
import type {
  ConfigRegistryControllerMessenger,
  ConfigRegistryControllerInitMessenger,
} from '../messengers/config-registry-controller-messenger';
import { getDefaultConfigRegistryControllerState } from '../../../util/config-registry';
import { CONFIG_REGISTRY_API_ENABLED_FLAG_KEY } from '../../../selectors/configRegistry';
import Logger from '../../../util/Logger';

/** Controller messenger type expected by the package (for type-safe cast). */
type PackageConfigRegistryMessenger = ConstructorParameters<
  typeof ConfigRegistryController
>[0]['messenger'];

/**
 * Controller messenger shape used for the initial fetch (cast for fetchConfig call only).
 */
interface ControllerMessengerWithFetch {
  call(
    action: 'ConfigRegistryApiService:fetchConfig',
    opts?: { etag?: string },
  ): Promise<FetchConfigResult>;
}

/**
 * Controller with update (from BaseController) for applying fetched config.
 * The package does not export a type that includes update(); this local type is required.
 */
type ControllerWithUpdate = ConfigRegistryController & {
  update(
    producer: (state: {
      configs: { networks: Record<string, RegistryNetworkConfig> };
      version: string | null;
      lastFetched: number | null;
      etag: string | null;
    }) => void,
  ): void;
};

/** RemoteFeatureFlagController state shape (for getState / stateChange). */
interface RemoteFeatureFlagControllerStateShape {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}

/**
 * Resolves the config registry API flag from controller state, merging remote + local overrides.
 */
function isConfigRegistryApiEnabled(
  initMessenger: ConfigRegistryControllerInitMessenger | undefined,
): boolean {
  if (!initMessenger) {
    return false;
  }
  const state = initMessenger.call('RemoteFeatureFlagController:getState') as
    | RemoteFeatureFlagControllerStateShape
    | undefined;
  const remote = state?.remoteFeatureFlags ?? {};
  const overrides = state?.localOverrides ?? {};
  const merged = { ...remote, ...overrides };
  const value = merged[CONFIG_REGISTRY_API_ENABLED_FLAG_KEY];
  return typeof value === 'boolean' && value;
}

/**
 * Runs the initial config registry fetch and applies the result to the controller.
 * Used both at init (when flag is already true) and when the flag turns true later.
 */
function runInitialFetch(
  controller: ControllerWithUpdate,
  controllerMessenger: ControllerMessengerWithFetch,
): void {
  const schedule =
    typeof setImmediate !== 'undefined'
      ? setImmediate
      : (fn: () => void) => setTimeout(fn, 0);
  schedule(async () => {
    try {
      const fetchResult = await controllerMessenger.call(
        'ConfigRegistryApiService:fetchConfig',
        {},
      );

      if (!fetchResult.modified || !fetchResult.data) {
        return;
      }
      const { data } = fetchResult;
      const apiChains = data.data.chains;
      const newConfigs: Record<string, RegistryNetworkConfig> = {};
      apiChains.forEach((chainConfig: RegistryNetworkConfig) => {
        const { chainId } = chainConfig;
        newConfigs[chainId] = chainConfig;
      });
      controller.update((state) => {
        const { configs } = state;
        configs.networks = newConfigs;
        state.version = data.data.version;
        state.lastFetched = Date.now();
        state.etag = fetchResult.etag ?? null;
      });
    } catch (err) {
      Logger.error(
        err as Error,
        '[ConfigRegistryControllerInit] Initial fetch failed (non-fatal)',
      );
    }
  });
}

const LOG_TAG = 'ConfigRegistryControllerInit';

/**
 * Returns a stub controller used when init fails so Engine.init() can complete.
 */
function createStubConfigRegistryController(): ConfigRegistryController {
  const state = getDefaultConfigRegistryControllerState();
  return {
    state,
    startPolling: () => undefined,
    stopAllPolling: () => undefined,
  } as unknown as ConfigRegistryController;
}

/**
 * Initialize the Config Registry controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The messenger to use for initialization.
 * @param request.persistedState - The persisted state of the engine.
 * @returns The initialized controller.
 */
export const configRegistryControllerInit: ControllerInitFunction<
  ConfigRegistryController,
  ConfigRegistryControllerMessenger,
  ConfigRegistryControllerInitMessenger
> = ({
  controllerMessenger,
  initMessenger,
  persistedState,
}: ControllerInitRequest<
  ConfigRegistryControllerMessenger,
  ConfigRegistryControllerInitMessenger
>) => {
  if (!controllerMessenger) {
    throw new Error('ConfigRegistryController requires a controllerMessenger');
  }

  if (!initMessenger) {
    throw new Error('ConfigRegistryController requires an initMessenger');
  }

  try {
    const persistedControllerState =
      persistedState?.ConfigRegistryController ??
      getDefaultConfigRegistryControllerState();

    const controller = new ConfigRegistryController({
      messenger: controllerMessenger as PackageConfigRegistryMessenger,
      state: persistedControllerState,
    });

    const hasPersistedConfigs =
      controller.state.configs?.networks &&
      Object.keys(controller.state.configs.networks).length > 0;

    const isConfigRegistryApiEnabledFlag =
      isConfigRegistryApiEnabled(initMessenger);

    if (!hasPersistedConfigs && isConfigRegistryApiEnabledFlag) {
      runInitialFetch(
        controller as ControllerWithUpdate,
        controllerMessenger as unknown as ControllerMessengerWithFetch,
      );
    }

    let pollingStarted = isConfigRegistryApiEnabledFlag;
    if (isConfigRegistryApiEnabledFlag) {
      controller.startPolling(null);
    }

    initMessenger.subscribe('RemoteFeatureFlagController:stateChange', () => {
      if (!isConfigRegistryApiEnabled(initMessenger)) {
        return;
      }
      const hasConfigs =
        controller.state.configs?.networks &&
        Object.keys(controller.state.configs.networks).length > 0;
      if (hasConfigs) {
        return;
      }
      runInitialFetch(
        controller as ControllerWithUpdate,
        controllerMessenger as unknown as ControllerMessengerWithFetch,
      );
      if (!pollingStarted) {
        pollingStarted = true;
        controller.startPolling(null);
      }
    });

    return { controller };
  } catch (error) {
    Logger.error(
      error as Error,
      `${LOG_TAG}: Init failed; using stub so Engine init can continue`,
    );
    return { controller: createStubConfigRegistryController() };
  }
};
