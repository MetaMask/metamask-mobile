import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';

import { ensureValidState } from './util';
import migrate, {
  migrationVersion,
  MEGAETH_TESTNET_V2_CONFIG,
  MEGAETH_TESTNET_V1_CHAIN_ID,
} from './109';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

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

  it('removes the megaeth testnet v1 network configuration and adds the megaeth testnet v2 network configuration', async () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              [MEGAETH_TESTNET_V1_CHAIN_ID]: {
                chainId: MEGAETH_TESTNET_V1_CHAIN_ID,
                name: 'Mega Testnet',
                nativeCurrency: 'MegaETH',
                blockExplorerUrls: ['https://explorer.com'],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                rpcEndpoints: [
                  {
                    networkClientId: 'megaeth-testnet',
                    type: RpcEndpointType.Custom,
                    url: 'https://rpc.com',
                  },
                ],
              },
            },
          },
        },
      },
    };

    const expectedStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const newStorage = await migrate(oldStorage);

    expect(newStorage).toStrictEqual(expectedStorage);
  });
});
