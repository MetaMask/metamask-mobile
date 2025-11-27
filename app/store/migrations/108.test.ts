import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';

import { ensureValidState } from './util';
import migrate from './108';
import { RootState } from '../../reducers';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const migrationVersion = 108;
const OLD_CHAIN_ID = '0x18c6';
const NEW_CHAIN_ID = '0x18c7';
const OLD_RPC_URL = 'https://carrot.megaeth.com/rpc';
const NEW_RPC_URL = 'https://timothy.megaeth.com/rpc';
const NETWORK_CLIENT_ID = 'megaeth-testnet';

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  const invalidStates = [
    {
      state: {
        engine: {},
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state structure: missing required properties`,
      scenario: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state structure: missing required properties`,
      scenario: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state: 'string'`,
      scenario: 'invalid NetworkController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {},
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
      scenario: 'missing networkConfigurationsByChainId property',
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
      errorMessage: `Migration ${migrationVersion}: Invalid NetworkController networkConfigurationsByChainId: 'string'`,
      scenario: 'invalid networkConfigurationsByChainId state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [OLD_CHAIN_ID]: 'invalid',
              },
            },
          },
        },
      },
      errorMessage: `Migration ${migrationVersion}: Invalid MegaETH Testnet network configuration: 'string'`,
      scenario: 'invalid MegaETH Testnet network configuration',
    },
  ];

  it.each(invalidStates)(
    'should capture exception if $scenario',
    ({ errorMessage, state }) => {
      const orgState = cloneDeep(state);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(state);

      // State should be unchanged
      expect(migratedState).toStrictEqual(orgState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    },
  );

  it('does not modify state and does not capture exception if MegaETH Testnet network is not found', () => {
    const state = {
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
            },
          },
        },
      },
    };
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('updates MegaETH Testnet chain ID and RPC URL', () => {
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
              [OLD_CHAIN_ID]: {
                chainId: OLD_CHAIN_ID,
                rpcEndpoints: [
                  {
                    networkClientId: NETWORK_CLIENT_ID,
                    url: OLD_RPC_URL,
                    type: RpcEndpointType.Custom,
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://megaexplorer.xyz'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Mega Testnet',
                nativeCurrency: 'MegaETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState);

    expect(
      (migratedState as RootState).engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[OLD_CHAIN_ID],
    ).toBeUndefined();

    expect(
      (migratedState as RootState).engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[NEW_CHAIN_ID],
    ).toBeDefined();

    const newConfig = (migratedState as RootState).engine.backgroundState
      .NetworkController.networkConfigurationsByChainId[NEW_CHAIN_ID];

    expect(newConfig.chainId).toBe(NEW_CHAIN_ID);
    expect(newConfig.rpcEndpoints[0].url).toBe(NEW_RPC_URL);
    expect(newConfig.rpcEndpoints[0].networkClientId).toBe(NETWORK_CLIENT_ID);
    expect(newConfig.name).toBe('Mega Testnet');
    expect(newConfig.nativeCurrency).toBe('MegaETH');
  });

  it('preserves other network configurations', () => {
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
              [OLD_CHAIN_ID]: {
                chainId: OLD_CHAIN_ID,
                rpcEndpoints: [
                  {
                    networkClientId: NETWORK_CLIENT_ID,
                    url: OLD_RPC_URL,
                    type: RpcEndpointType.Custom,
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://megaexplorer.xyz'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Mega Testnet',
                nativeCurrency: 'MegaETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState);

    const mainnetConfig = (migratedState as RootState).engine.backgroundState
      .NetworkController.networkConfigurationsByChainId['0x1'];

    expect(mainnetConfig).toEqual(
      oldState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId['0x1'],
    );
  });

  it('only updates RPC endpoints with the old URL', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: NETWORK_CLIENT_ID,
            networksMetadata: {},
            networkConfigurationsByChainId: {
              [OLD_CHAIN_ID]: {
                chainId: OLD_CHAIN_ID,
                rpcEndpoints: [
                  {
                    networkClientId: NETWORK_CLIENT_ID,
                    url: OLD_RPC_URL,
                    type: RpcEndpointType.Custom,
                  },
                  {
                    networkClientId: `${NETWORK_CLIENT_ID}-backup`,
                    url: 'https://other-rpc.com/rpc',
                    type: RpcEndpointType.Custom,
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://megaexplorer.xyz'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Mega Testnet',
                nativeCurrency: 'MegaETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState);

    const newConfig = (migratedState as RootState).engine.backgroundState
      .NetworkController.networkConfigurationsByChainId[NEW_CHAIN_ID];

    expect(newConfig.rpcEndpoints[0].url).toBe(NEW_RPC_URL);
    expect(newConfig.rpcEndpoints[1].url).toBe('https://other-rpc.com/rpc');
  });

  it('handles network configuration without rpcEndpoints', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              [OLD_CHAIN_ID]: {
                chainId: OLD_CHAIN_ID,
                name: 'Mega Testnet',
                nativeCurrency: 'MegaETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState);

    const newConfig = (migratedState as RootState).engine.backgroundState
      .NetworkController.networkConfigurationsByChainId[NEW_CHAIN_ID];

    expect(newConfig.chainId).toBe(NEW_CHAIN_ID);
    expect(newConfig.name).toBe('Mega Testnet');
    expect(newConfig.nativeCurrency).toBe('MegaETH');
  });
});
