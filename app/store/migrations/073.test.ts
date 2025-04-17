import { RpcEndpointType } from '@metamask/network-controller';
import { captureException } from '@sentry/react-native';
import migrate from './073';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const captureExceptionMock = jest.mocked(captureException);

const VERSION = 73;

const MM_INFURA_PROJECT_ID = 'some-infura-project-id';
const QUICKNODE_MAINNET_URL = 'https://example.quicknode.com/mainnet';
const QUICKNODE_LINEA_MAINNET_URL =
  'https://example.quicknode.com/linea-mainnet';
const QUICKNODE_ARBITRUM_URL = 'https://example.quicknode.com/arbitrum';
const QUICKNODE_AVALANCHE_URL = 'https://example.quicknode.com/avalanche';
const QUICKNODE_OPTIMISM_URL = 'https://example.quicknode.com/optimism';
const QUICKNODE_POLYGON_URL = 'https://example.quicknode.com/polygon';
const QUICKNODE_BASE_URL = 'https://example.quicknode.com/base';

describe(`Migration #${VERSION}`, () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    originalEnv = { ...process.env };
  });

  afterEach(() => {
    for (const key of new Set([
      ...Object.keys(originalEnv),
      ...Object.keys(process.env),
    ])) {
      if (originalEnv[key]) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('logs an error and returns the state unchanged if MM_INFURA_PROJECT_ID is not set', async () => {
    const state = {};
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: No MM_INFURA_PROJECT_ID set!`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if the state is not an object', () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = 'not-an-object';
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Expected state to be an object, but is string`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine is missing', () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {};
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Missing state.engine`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine is not object', () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = { engine: 'not-an-object' };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Expected state.engine to be an object, but is string`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine.backgroundState is missing', () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {},
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Missing state.engine.backgroundState`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine.backgroundState is not an object', () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: 'not-an-object',
      },
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Expected state.engine.backgroundState to be an object, but is string`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine.backgroundState.NetworkController is missing', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Missing state.engine.backgroundState.NetworkController`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine.backgroundState.NetworkController is not an object', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: 'not-an-object',
        },
      },
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Expected state.engine.backgroundState.NetworkController to be an object, but is string`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if state.engine.backgroundState.NetworkController.networkConfigurationsByChainId is missing', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {},
        },
      },
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Missing state.engine.backgroundState.NetworkController.networkConfigurationsByChainId`,
      }),
    );
  });

  it('logs an error and returns the state unchanged if NetworkController.networkConfigurationsByChainId is not an object', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: 'not-an-object',
          },
        },
      },
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toBe(expectedState);
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `FATAL ERROR: Migration ${VERSION}: Expected state.engine.backgroundState.NetworkController.networkConfigurationsByChainId to be an object, but is string`,
      }),
    );
  });

  it('returns the state unchanged if state.engine.backgroundState.NetworkController.networkConfigurationsByChainId is empty', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {},
          },
        },
      },
    };
    const expectedState = state;

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('does not update any network configurations that are not objects', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': 'not-an-object',
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': 'not-an-object',
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('does not update any network configurations that do not have rpcEndpoints', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {},
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {},
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('assigns an empty set of failover URLs to custom RPC endpoints that use non-Infura URLs', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x539': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: 'https://foo.com',
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x539': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: 'https://foo.com',
                    failoverUrls: [],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('assigns an empty set of failover URLs to custom RPC endpoints that contain an Infura URL but do not use our API key', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: 'https://mainnet.infura.io/v3/some-other-api-key',
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: 'https://mainnet.infura.io/v3/some-other-api-key',
                    failoverUrls: [],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('assigns failover URLs to known Infura RPC endpoints', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_MAINNET_URL = QUICKNODE_MAINNET_URL;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    process.env.QUICKNODE_ARBITRUM_URL = QUICKNODE_ARBITRUM_URL;
    process.env.QUICKNODE_AVALANCHE_URL = QUICKNODE_AVALANCHE_URL;
    process.env.QUICKNODE_OPTIMISM_URL = QUICKNODE_OPTIMISM_URL;
    process.env.QUICKNODE_POLYGON_URL = QUICKNODE_POLYGON_URL;
    process.env.QUICKNODE_BASE_URL = QUICKNODE_BASE_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://arbitrum.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://avalanche.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://optimism.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://polygon.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://base.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_MAINNET_URL],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://arbitrum.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_ARBITRUM_URL],
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://avalanche.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_AVALANCHE_URL],
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://optimism.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_OPTIMISM_URL],
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://polygon.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_POLYGON_URL],
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://base.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_BASE_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('assigns an empty set of failover URLs to any Infura endpoints for which the appropriate environment variable is not set', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://arbitrum.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://avalanche.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://optimism.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://polygon.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://base.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://arbitrum.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://avalanche.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://optimism.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://polygon.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://base.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('does not update any Infura RPC endpoints that already have failover URLs defined', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: ['https://foo.com'],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: ['https://foo.com'],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Infura,
                    url: `https://linea-mainnet.infura.io/v3/{infuraProjectId}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('assigns failover URLs to custom RPC endpoints that are actually Infura RPC endpoints in disguise', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_MAINNET_URL = QUICKNODE_MAINNET_URL;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    process.env.QUICKNODE_ARBITRUM_URL = QUICKNODE_ARBITRUM_URL;
    process.env.QUICKNODE_AVALANCHE_URL = QUICKNODE_AVALANCHE_URL;
    process.env.QUICKNODE_OPTIMISM_URL = QUICKNODE_OPTIMISM_URL;
    process.env.QUICKNODE_POLYGON_URL = QUICKNODE_POLYGON_URL;
    process.env.QUICKNODE_BASE_URL = QUICKNODE_BASE_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://linea-mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://arbitrum.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://avalanche.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://optimism.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://polygon.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://base.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_MAINNET_URL],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://linea-mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://arbitrum.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_ARBITRUM_URL],
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://avalanche.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_AVALANCHE_URL],
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://optimism.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_OPTIMISM_URL],
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://polygon.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_POLYGON_URL],
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://base.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_BASE_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('assigns an empty set of failover URLs to custom RPC endpoints that are actually Infura RPC endpoints in disguise but for which the appropriate environment variables are not set', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://linea-mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://arbitrum.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://avalanche.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://optimism.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://polygon.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://base.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://linea-mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xa4b1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://arbitrum.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xa86a': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://avalanche.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0xa': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://optimism.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0x89': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://polygon.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
              '0x2105': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://base.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });

  it('does not update any in-disguise Infura RPC endpoints that already have failover URLs defined', async () => {
    process.env.MM_INFURA_PROJECT_ID = MM_INFURA_PROJECT_ID;
    process.env.QUICKNODE_LINEA_MAINNET_URL = QUICKNODE_LINEA_MAINNET_URL;
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: ['https://foo.com'],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://linea-mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                  },
                ],
              },
            },
          },
        },
      },
    };
    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: ['https://foo.com'],
                  },
                ],
              },
              '0xe708': {
                rpcEndpoints: [
                  {
                    type: RpcEndpointType.Custom,
                    url: `https://linea-mainnet.infura.io/v3/${MM_INFURA_PROJECT_ID}`,
                    failoverUrls: [QUICKNODE_LINEA_MAINNET_URL],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(state);

    expect(newState).toStrictEqual(expectedState);
  });
});
