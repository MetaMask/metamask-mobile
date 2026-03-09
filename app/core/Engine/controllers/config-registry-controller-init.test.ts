import { ConfigRegistryController } from '@metamask/config-registry-controller';
import { getRootExtendedMessenger, type ControllerInitRequest } from '../types';
import {
  getConfigRegistryControllerMessenger,
  getConfigRegistryControllerInitMessenger,
  type ConfigRegistryControllerMessenger,
  type ConfigRegistryControllerInitMessenger,
} from '../messengers/config-registry-controller-messenger';
import { buildControllerInitRequestMock } from '../utils/test-utils';
import { configRegistryControllerInit } from './config-registry-controller-init';
import { CONFIG_REGISTRY_API_ENABLED_FLAG_KEY } from '../../../selectors/configRegistry';

jest.mock('@metamask/config-registry-controller');

const defaultState = {
  configs: { networks: {} },
  version: null,
  lastFetched: null,
  etag: null,
};

function buildInitRequest(
  remoteFeatureFlags?: Record<string, unknown>,
  localOverrides?: Record<string, unknown>,
) {
  const rootMessenger = getRootExtendedMessenger();
  const controllerMessenger = getConfigRegistryControllerMessenger(
    rootMessenger as never,
  );
  const initMessenger = getConfigRegistryControllerInitMessenger(
    rootMessenger as never,
  );

  jest.spyOn(initMessenger, 'call').mockImplementation((action: string) => {
    if (action === 'RemoteFeatureFlagController:getState') {
      return {
        remoteFeatureFlags: remoteFeatureFlags ?? {},
        localOverrides: localOverrides ?? {},
      } as never;
    }
    return undefined as never;
  });

  jest.spyOn(initMessenger, 'subscribe').mockImplementation(() => jest.fn());

  return {
    ...buildControllerInitRequestMock(rootMessenger),
    controllerMessenger,
    initMessenger,
    persistedState: {},
  } as unknown as ControllerInitRequest<
    ConfigRegistryControllerMessenger,
    ConfigRegistryControllerInitMessenger
  >;
}

describe('configRegistryControllerInit', () => {
  const mockStartPolling = jest.fn();
  let mockControllerInstance: {
    state: typeof defaultState;
    startPolling: jest.Mock;
    stopAllPolling: jest.Mock;
    update?: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockControllerInstance = {
      state: { ...defaultState },
      startPolling: mockStartPolling,
      stopAllPolling: jest.fn(),
      update: jest.fn(),
    };
    (ConfigRegistryController as jest.Mock).mockImplementation(() => ({
      ...mockControllerInstance,
      state: mockControllerInstance.state,
    }));
  });

  it('returns a controller instance', () => {
    const request = buildInitRequest();
    const result = configRegistryControllerInit(request);
    expect(result.controller).toBeDefined();
    expect(ConfigRegistryController).toHaveBeenCalled();
  });

  it('initializes with persisted state when provided', () => {
    const persistedState = {
      configs: { networks: { 'eip155:1': {} as never } },
      version: '1.0',
      lastFetched: Date.now(),
      etag: null,
    };
    const request = buildInitRequest();
    request.persistedState = { ConfigRegistryController: persistedState };
    configRegistryControllerInit(request);
    expect(ConfigRegistryController).toHaveBeenCalledWith(
      expect.objectContaining({
        state: persistedState,
      }),
    );
  });

  it('throws when controllerMessenger is missing', () => {
    const request = buildInitRequest();
    request.controllerMessenger = null as never;
    expect(() => configRegistryControllerInit(request)).toThrow(
      'ConfigRegistryController requires a controllerMessenger',
    );
  });

  it('throws when initMessenger is missing', () => {
    const request = buildInitRequest();
    request.initMessenger = null as never;
    expect(() => configRegistryControllerInit(request)).toThrow(
      'ConfigRegistryController requires an initMessenger',
    );
  });

  it('starts polling when flag is enabled', () => {
    const request = buildInitRequest({
      [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
    });
    configRegistryControllerInit(request);
    expect(mockStartPolling).toHaveBeenCalledWith(null);
  });

  it('does not start polling when flag is disabled', () => {
    const request = buildInitRequest({
      [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: false,
    });
    configRegistryControllerInit(request);
    expect(mockStartPolling).not.toHaveBeenCalled();
  });

  it('subscribes to RemoteFeatureFlagController:stateChange', () => {
    const request = buildInitRequest();
    configRegistryControllerInit(request);
    expect(request.initMessenger.subscribe).toHaveBeenCalledWith(
      'RemoteFeatureFlagController:stateChange',
      expect.any(Function),
    );
  });

  it('runs initial fetch when flag is enabled and no persisted configs', async () => {
    const request = buildInitRequest({
      [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
    });
    const fetchResult = {
      modified: true,
      etag: 'etag1',
      data: {
        data: {
          chains: [
            {
              chainId: 'eip155:1',
              name: 'Ethereum',
              rpcProviders: {
                default: { url: 'https://eth.llamarpc.com' },
                fallbacks: [],
              },
            },
          ],
          version: '1',
        },
      },
    };
    jest
      .spyOn(request.controllerMessenger, 'call')
      .mockImplementation((action: string) => {
        if (action === 'ConfigRegistryApiService:fetchConfig') {
          return Promise.resolve(fetchResult) as never;
        }
        return undefined as never;
      });

    configRegistryControllerInit(request);

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockControllerInstance.update).toHaveBeenCalledWith(
      expect.any(Function),
    );
    const producer = (mockControllerInstance.update as jest.Mock).mock
      .calls[0][0];
    const state = {
      configs: { networks: {} },
      version: null,
      lastFetched: null,
      etag: null,
    };
    producer(state);
    expect(state.configs.networks).toEqual({
      'eip155:1': fetchResult.data.data.chains[0],
    });
    expect(state.version).toBe('1');
    expect(state.etag).toBe('etag1');
  });

  it('subscribe callback runs initial fetch when flag turns true and no configs', async () => {
    const request = buildInitRequest({
      [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: false,
    });
    jest
      .spyOn(request.controllerMessenger, 'call')
      .mockImplementation((action: string) => {
        if (action === 'ConfigRegistryApiService:fetchConfig') {
          return Promise.resolve({
            modified: true,
            etag: null,
            data: {
              data: { chains: [], version: '1' },
            },
          }) as never;
        }
        return undefined as never;
      });

    configRegistryControllerInit(request);

    const subscribeCb = (request.initMessenger.subscribe as jest.Mock).mock
      .calls[0][1];
    (request.initMessenger.call as jest.Mock).mockImplementation(
      (action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return {
            remoteFeatureFlags: {
              [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true,
            },
            localOverrides: {},
          } as never;
        }
        return undefined as never;
      },
    );

    subscribeCb();

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockControllerInstance.update).toHaveBeenCalled();
    expect(mockStartPolling).toHaveBeenCalledWith(null);
  });

  it('returns stub controller when init throws', () => {
    (ConfigRegistryController as jest.Mock).mockImplementationOnce(() => {
      throw new Error('init failed');
    });
    const request = buildInitRequest();

    const result = configRegistryControllerInit(request);

    expect(result.controller).toBeDefined();
    expect(result.controller.state).toEqual(defaultState);
    expect(typeof result.controller.startPolling).toBe('function');
    expect(typeof result.controller.stopAllPolling).toBe('function');
  });

  it('treats flag as enabled when localOverrides overrides remote', () => {
    const request = buildInitRequest(
      { [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: false },
      { [CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]: true },
    );
    configRegistryControllerInit(request);
    expect(mockStartPolling).toHaveBeenCalledWith(null);
  });
});
