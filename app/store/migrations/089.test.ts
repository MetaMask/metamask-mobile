import migrate from './089';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import { RootState } from '../../reducers';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #89 - Replace BSC Network RPC URL', () => {
  const BSC_CHAIN_ID = '0x38';
  const OLD_RPC_URL = 'https://bsc-dataseed1.binance.org';
  const NEW_RPC_URL = `https://bsc-mainnet.infura.io/v3/${
    process.env.MM_INFURA_PROJECT_ID === 'null'
      ? ''
      : process.env.MM_INFURA_PROJECT_ID
  }`;
  const LINEA_CHAIN_ID = '0x1234';

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 89: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 89: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 89: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, async () => {
      const newState = await migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should replace the first occurrence of the BSC network RPC URL', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [BSC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: OLD_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const expectedState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [BSC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: NEW_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(expectedState);
  });

  it('should do nothing if the BSC network configuration is missing', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {},
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should do nothing if the Base network RPC URL is not present', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [BSC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://another.rpc' },
                  { url: 'https://yet.another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should handle cases where rpcEndpoints is not an array', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [BSC_CHAIN_ID]: {
                rpcEndpoints: null,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should do nothing if no networks use Infura RPC endpoints', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  { url: 'https://non-infura.rpc' },
                  { url: 'https://another-non-infura.rpc' },
                ],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(oldState);
  });

  it('should proceed with migration if at least one network uses an Infura RPC endpoint', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                rpcEndpoints: [
                  { url: 'https://mainnet.infura.io/v3/some-key' },
                  { url: 'https://non-infura.rpc' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [BSC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: OLD_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const expectedState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [BSC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: NEW_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);
    expect(newState).toStrictEqual(expectedState);
  });

  it('should exclude LINEA_MAINNET from Infura RPC endpoint checks', async () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [LINEA_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: 'https://linea.infura.io/v3/some-key' },
                  { url: 'https://another-linea.rpc' },
                ],
                defaultRpcEndpointIndex: 0,
              },
              [BSC_CHAIN_ID]: {
                rpcEndpoints: [
                  { url: OLD_RPC_URL },
                  { url: 'https://another.rpc' },
                ],
              },
            },
          },
        },
      },
    });

    const newState = await migrate(oldState);

    // The LINEA_MAINNET should not trigger migration; only BSC_CHAIN_ID is updated
    expect(
      (newState as RootState).engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[LINEA_CHAIN_ID],
    ).toStrictEqual(
      oldState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[LINEA_CHAIN_ID],
    );
    expect(
      (newState as RootState).engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[BSC_CHAIN_ID].rpcEndpoints[0].url,
    ).toBe(NEW_RPC_URL);
  });

  it('should capture exception when NetworkController structure is invalid', async () => {
    const oldState = merge(
      {},
      {
        engine: {
          backgroundState: {
            NetworkController: {
              // Valid object but missing networkConfigurationsByChainId
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              // networkConfigurationsByChainId is intentionally missing
            },
          },
        },
      },
    );

    const newState = await migrate(oldState);

    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      'Migration 89: NetworkController or networkConfigurationsByChainId not found in expected state structure. Skipping BSC RPC endpoint migration.',
    );
  });
});
