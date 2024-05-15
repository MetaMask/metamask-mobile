import migration from './040';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';

const oldState = {
  engine: {
    backgroundState: {
      PermissionController: {
        subjects: {
          'app.uniswap.org': {
            origin: 'app.uniswap.org',
            permissions: {
              eth_accounts: {
                id: 'ukrFhz7_z1gbog3mWNIoA',
                parentCapability: 'eth_accounts',
                invoker: 'app.uniswap.org',
                caveats: [
                  {
                    type: 'restrictReturnedAccounts',
                    value: [
                      {
                        address: '0x04B09A749Bc6a1C111de308694Ba1Cd74A698523',
                        lastUsed: 1714709418122,
                      },
                    ],
                  },
                ],
                date: 1714709418138,
              },
            },
          },
        },
      },
    },
  },
};

const expectedNewState = {
  engine: {
    backgroundState: {
      PermissionController: {
        subjects: {
          'app.uniswap.org': {
            origin: 'app.uniswap.org',
            permissions: {
              eth_accounts: {
                id: 'ukrFhz7_z1gbog3mWNIoA',
                parentCapability: 'eth_accounts',
                invoker: 'app.uniswap.org',
                caveats: [
                  {
                    type: 'restrictReturnedAccounts',
                    value: ['0x04B09A749Bc6a1C111de308694Ba1Cd74A698523'],
                  },
                ],
                date: 1714709418138,
              },
            },
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

describe('Migration #40', () => {
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
        "FATAL ERROR: Migration 40: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 40: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PermissionController: null,
          },
        },
      }),
      errorMessage:
        "Migration 40: Invalid PermissionController state error: 'null'",
      scenario: 'PermissionController state is invalid',
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

  it('should update caveat values to resemble an array of addresses', async () => {
    const newState = await migration(oldState);
    expect(newState).toStrictEqual(expectedNewState);
  });
});
