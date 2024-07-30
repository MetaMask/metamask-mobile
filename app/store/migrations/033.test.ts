import migration from './033';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { GOERLI, SEPOLIA } from '../../../app/constants/network';
import NetworkList from '../../../app/util/networks';

const oldState = {
  engine: {
    backgroundState: {
      NetworkController: {
        isCustomNetwork: true,
        networkConfigurations: {},
        networkDetails: { EIPS: { '1559': true } },
        networkId: '5',
        networkStatus: 'available',
        providerConfig: {
          chainId: CHAIN_IDS.GOERLI,
          rpcPrefs: { blockExplorerUrl: 'https://goerli.etherscan.io' },
          ticker: 'GoerliETH',
          type: GOERLI,
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
        networkId: `${NetworkList[SEPOLIA].networkId}`,
        networkStatus: 'available',
        providerConfig: {
          chainId: CHAIN_IDS.SEPOLIA,
          ticker: 'SepoliaETH',
          type: SEPOLIA,
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #33', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 33: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "Migration 33: Invalid engine backgroundState error: 'object'",
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
        "Migration 33: Invalid NetworkController state error: 'object'",
      scenario: 'NetworkController state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { providerConfig: null },
          },
        },
      }),
      errorMessage:
        "Migration 33: NetworkController providerConfig not found: 'null'",
      scenario: 'providerConfig is invalid',
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
        "Migration 33: NetworkController providerConfig chainId not found: 'null'",
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
