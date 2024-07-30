import migration from './046';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const oldState = {
  engine: {
    backgroundState: {
      NetworkController: {
        isCustomNetwork: true,
        networkConfigurations: {},
        networkDetails: { EIPS: { '1559': true } },
        networkStatus: 'available',
        selectedNetworkClientId: 'linea-goerli',
        providerConfig: {
          chainId: CHAIN_IDS.LINEA_GOERLI,
          rpcPrefs: { blockExplorerUrl: 'https://explorer.goerli.linea.build' },
          ticker: 'LineaETH',
          type: 'linea-goerli',
        },
      },
    },
  },
};

const expectedNewState = {
  engine: {
    backgroundState: {
      NetworkController: {
        isCustomNetwork: true,
        networkConfigurations: {},
        networkDetails: { EIPS: { '1559': true } },
        networkStatus: 'available',
        selectedNetworkClientId: 'linea-sepolia',
        providerConfig: {
          chainId: CHAIN_IDS.LINEA_SEPOLIA,
          ticker: 'LineaETH',
          type: 'linea-sepolia',
          rpcPrefs: { blockExplorerUrl: 'https://sepolia.lineascan.build' },
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #46', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 46: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 46: Invalid engine backgroundState error: 'object'",
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
        "FATAL ERROR: Migration 46: Invalid NetworkController state error: 'object'",
      scenario: 'NetworkController state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { providerConfig: { chainId: null } },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 46: NetworkController providerConfig chainId not found: 'null'",
      scenario: 'chainId is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, async () => {
      const newState = await migration(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('All states changing as expected', async () => {
    const newState = await migration(oldState);
    expect(newState).toStrictEqual(expectedNewState);
  });
});
