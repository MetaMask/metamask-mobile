import migration from './064';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';

const oldState = {
  engine: {
    backgroundState: {
      NetworkController: {
        selectedNetworkClientId: 'unknown-client-id',
        networkConfigurationsByChainId: {
          '0x1': {
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
          },
          '0x5': {
            rpcEndpoints: [{ networkClientId: 'goerli' }],
          },
        },
      },
    },
  },
};

const expectedNewState = {
  engine: {
    backgroundState: {
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {
          '0x1': {
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
          },
          '0x5': {
            rpcEndpoints: [{ networkClientId: 'goerli' }],
          },
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #62', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: null,
          },
        },
      }),
      errorMessage:
        "Migration 62: Invalid or missing 'NetworkController' in backgroundState: 'object'",
      scenario: 'NetworkController state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { selectedNetworkClientId: null },
          },
        },
      }),
      errorMessage:
        "Migration 62: Missing or invalid 'selectedNetworkClientId': 'null'",
      scenario: 'selectedNetworkClientId is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: { networkConfigurationsByChainId: null },
          },
        },
      }),
      errorMessage:
        "Migration 62: Missing or invalid 'networkConfigurationsByChainId' in NetworkController",
      scenario: 'networkConfigurationsByChainId is invalid',
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

  it('should set selectedNetworkClientId to "mainnet" if it does not exist in networkConfigurationsByChainId', async () => {
    const newState = await migration(oldState);
    expect(newState).toStrictEqual(expectedNewState);
  });

  it('should keep selectedNetworkClientId unchanged if it exists in networkConfigurationsByChainId', async () => {
    const validState = merge({}, oldState, {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
          },
        },
      },
    });
    const newState = await migration(validState);

    expect(newState).toStrictEqual(validState);
  });
});
