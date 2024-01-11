import migrate from './024';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import initialBackgroundState from '../../util/test/initial-background-state.json';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #24', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });
  const invalidBackgroundStates = [
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: null,
          },
        },
      }),
      errorMessage: "Migration 24: Invalid network controller state: 'object'",
      scenario: 'network controller state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { network: null },
          },
        },
      }),
      errorMessage: "Migration 24: Invalid network state: 'object'",
      scenario: 'network state is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidBackgroundStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should migrate loading network state', () => {
    const state = {
      engine: {
        backgroundState: merge({}, initialBackgroundState, {
          NetworkController: {
            network: 'loading',
          },
        }),
      },
    };

    const newState = migrate(state);

    expect(newState.engine.backgroundState.NetworkController).toStrictEqual({
      networkConfigurations: {},
      networkDetails: {
        isEIP1559Compatible: false,
      },
      networkId: null,
      networkStatus: 'unknown',
      providerConfig: {
        chainId: '1',
        type: 'mainnet',
      },
    });
  });

  it('should migrate non-loading network state', () => {
    const state = {
      engine: {
        backgroundState: merge({}, initialBackgroundState, {
          NetworkController: {
            network: '1',
          },
        }),
      },
    };

    const newState = migrate(state);

    expect(newState.engine.backgroundState.NetworkController).toStrictEqual({
      networkConfigurations: {},
      networkDetails: {
        isEIP1559Compatible: false,
      },
      networkId: '1',
      networkStatus: 'available',
      providerConfig: {
        chainId: '1',
        type: 'mainnet',
      },
    });
  });
});
