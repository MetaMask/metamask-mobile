import migrate from './051';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #51', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const oldState = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurations: {
            'network-1-uuid': {
              chainId: '0x89',
              ticker: 'MATIC',
            },
            'network-2-uuid': {
              chainId: '0x1',
              ticker: 'ETH',
            },
          },
          providerConfig: {
            chainId: '0x1',
            ticker: 'ETH',
          },
        },
      },
    },
  };

  const expectedNewState = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurations: {
            'network-1-uuid': {
              chainId: '0x89',
              ticker: 'POL',
            },
            'network-2-uuid': {
              chainId: '0x1',
              ticker: 'ETH',
            },
          },
          providerConfig: {
            chainId: '0x1',
            ticker: 'ETH',
          },
        },
      },
    },
  };

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 51: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 51: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: null,
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 51: Invalid NetworkController state error: 'object'",
      scenario: 'NetworkController state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurations: null,
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 51: NetworkController networkConfigurations not found: 'null'",
      scenario: 'networkConfigurations is null',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurations: {},
              providerConfig: null,
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 51: providerConfig not found: 'null'",
      scenario: 'providerConfig is null',
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

  it('changes MATIC to POL for network with chainId 0x89', async () => {
    const newState = await migrate(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });

  it('does not change other networks', async () => {
    const modifiedOldState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'network-3-uuid': {
                chainId: '0x2a',
                ticker: 'KOVAN',
              },
            },
          },
        },
      },
    });

    const newState = (await migrate(
      modifiedOldState,
    )) as typeof modifiedOldState;

    const kovanNetwork = Object.values(
      newState.engine.backgroundState.NetworkController.networkConfigurations,
    ).find((network) => isObject(network) && network.ticker === 'KOVAN');

    expect(kovanNetwork).toStrictEqual({
      chainId: '0x2a',
      ticker: 'KOVAN',
    });
  });

  it("does not change ticker if network's chainId is 0x89 but ticker is not MATIC", async () => {
    const modifiedOldState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'network-1-uuid': {
                chainId: '0x89',
                ticker: 'NOT_MATIC',
              },
            },
          },
        },
      },
    });

    const newState = (await migrate(
      modifiedOldState,
    )) as typeof modifiedOldState;

    const customNotMaticPolygon = Object.values(
      newState.engine.backgroundState.NetworkController.networkConfigurations,
    ).find((network) => isObject(network) && network.ticker === 'NOT_MATIC');

    expect(customNotMaticPolygon).toStrictEqual({
      chainId: '0x89',
      ticker: 'NOT_MATIC',
    });
  });

  it("does not change ticker if network's chainId is 0x1 but ticker is MATIC", async () => {
    const modifiedOldState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'network-1-uuid': {
                chainId: '0x1',
                ticker: 'MATIC',
              },
            },
          },
        },
      },
    });

    const newState = (await migrate(
      modifiedOldState,
    )) as typeof modifiedOldState;

    const customNotMaticPolygon = Object.values(
      newState.engine.backgroundState.NetworkController.networkConfigurations,
    ).find((network) => isObject(network) && network.ticker === 'MATIC');

    expect(customNotMaticPolygon).toStrictEqual({
      chainId: '0x1',
      ticker: 'MATIC',
    });
  });

  it('changes providerConfig ticker to POL if chainId is 0x89 and ticker is MATIC', async () => {
    const modifiedOldState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: '0x89',
              ticker: 'MATIC',
            },
          },
        },
      },
    });

    const expectedState = merge({}, expectedNewState, {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: '0x89',
              ticker: 'POL',
            },
          },
        },
      },
    });

    const newState = await migrate(modifiedOldState);

    expect(newState).toStrictEqual(expectedState);
  });

  it('does not change providerConfig ticker if chainId is 0x89 but ticker is not MATIC', async () => {
    const modifiedOldState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: '0x89',
              ticker: 'NOT_MATIC',
            },
          },
        },
      },
    });

    const newState = (await migrate(
      modifiedOldState,
    )) as typeof modifiedOldState;

    expect(
      newState.engine.backgroundState.NetworkController.providerConfig.ticker,
    ).toBe('NOT_MATIC');
  });

  it('does not change providerConfig ticker if chainId is 0x1 but ticker is MATIC', async () => {
    const modifiedOldState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              chainId: '0x1',
              ticker: 'MATIC',
            },
          },
        },
      },
    });

    const newState = (await migrate(
      modifiedOldState,
    )) as typeof modifiedOldState;

    expect(
      newState.engine.backgroundState.NetworkController.providerConfig.ticker,
    ).toBe('MATIC');
  });
});
