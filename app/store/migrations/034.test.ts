import migrate from './034';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';

const expectedState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          chainId: '0x1',
          rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
          ticker: 'ETH',
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #34', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "Migration 34: Invalid root state: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 34: Invalid root engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "Migration 34: Invalid root engine backgroundState: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: null },
        },
      }),
      errorMessage: "Migration 34: Invalid NetworkController state: 'object'",
      scenario: 'NetworkController is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: { providerConfig: null } },
        },
      }),
      errorMessage:
        "Migration 34: Invalid NetworkController providerConfig: 'object'",
      scenario: 'providerConfig is invalid',
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

  it('should not change ticker if ticker was defined', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'AVAX',
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
  });

  it('should add ticker when no ticker is defined', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            },
          },
        },
      },
    };
    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
