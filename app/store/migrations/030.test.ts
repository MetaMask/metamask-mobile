import migration from './029';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller/dist/constants';
import { GOERLI, SEPOLIA } from '../../../app/constants/network';

const oldState = {
  engine: {
    backgroundState: {
      NetworkController: {
        providerConfig: {
          chainId: CHAIN_IDS.GOERLI,
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

describe('Migration #29', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 30: Invalid engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage: "Migration 30: Invalid engine backgroundState: 'object'",
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
      errorMessage: "Migration 30: Invalid NetworkController state: 'object'",
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
        "Migration 30: Invalid NetworkController providerConfig chainId: 'null'",
      scenario: 'chainId is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migration(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('All states changing as expected', () => {
    const newState = migration(oldState);

    expect(newState).toStrictEqual(expectedNewState);
  });
});
