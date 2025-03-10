import migrate from './065';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import { RootState } from '../../components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration: Remove Goerli and Linea Goerli if Infura type', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "Migration: Invalid root state: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration: Invalid root engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage: "Migration: Invalid root engine backgroundState: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: null },
        },
      }),
      errorMessage: "Migration: Invalid NetworkController state: 'object'",
      scenario: 'NetworkController is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`captures exception if ${scenario}`, async () => {
      const newState = await migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('removes Goerli and Linea Goerli configurations with Infura type', async () => {
    const mockState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x5': {
                blockExplorerUrls: [],
                chainId: '0x5',
                rpcEndpoints: [
                  {
                    networkClientId: 'goerli',
                    type: 'infura',
                  },
                ],
              },
              '0xe704': {
                blockExplorerUrls: [],
                chainId: '0xe704',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-goerli',
                    type: 'infura',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const migratedState = (await migrate(mockState)) as RootState;

    expect(
      migratedState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
    ).not.toHaveProperty('0x5');
    expect(
      migratedState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
    ).not.toHaveProperty('0xe704');
  });

  it('retains configurations that are not Infura type', async () => {
    const mockState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x5': {
                blockExplorerUrls: [],
                chainId: '0x5',
                rpcEndpoints: [
                  {
                    networkClientId: 'goerli',
                    type: 'custom',
                  },
                ],
              },
              '0xe704': {
                blockExplorerUrls: [],
                chainId: '0xe704',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-goerli',
                    type: 'custom',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const migratedState = (await migrate(mockState)) as RootState;

    expect(
      migratedState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
    ).toHaveProperty('0x5');
    expect(
      migratedState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
    ).toHaveProperty('0xe704');
  });

  it('does not modify state if no matching configurations exist', async () => {
    const mockState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': {
                blockExplorerUrls: [],
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    type: 'infura',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const migratedState = await migrate(mockState);

    expect(migratedState).toEqual(mockState);
  });
});
