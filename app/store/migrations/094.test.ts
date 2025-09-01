import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './094';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

describe('Migration 94: Update Sei Network name', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
          },
        },
      },
      test: 'invalid NetworkController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: 'invalid',
            },
          },
        },
      },
      test: 'invalid networkConfigurationsByChainId state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not update the SEI network name if it is not `Sei Network`', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0x531': {
                chainId: '0x531',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://seitrace.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Custom Sei Network',
                nativeCurrency: 'SEI',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = cloneDeep(oldState);

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('does not update the PRC network name if it is not `Sei Network`', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0x531': {
                chainId: '0x531',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                    name: 'My Custom Sei Network',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://seitrace.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Sei Network',
                nativeCurrency: 'SEI',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0x531': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x531'],
                name: 'Sei Mainnet',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                    name: 'My Custom Sei Network',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('updates the SEI network name and RRC name from `Sei Network` to `Sei Mainnet`', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0x531': {
                chainId: '0x531',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                    name: 'Sei Network',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://seitrace.com'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Sei Network',
                nativeCurrency: 'SEI',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0x531': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x531'],
                name: 'Sei Mainnet',
                rpcEndpoints: [
                  {
                    networkClientId: 'sei-network',
                    url: 'https://sei-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                    name: 'Sei Mainnet',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedData);
  });
});
