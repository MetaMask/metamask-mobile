import migrate from './64';
import { captureException, captureMessage } from '@sentry/react-native';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedCaptureMessage = jest.mocked(captureMessage);

const createToken = (address: string, decimals: number | null) => ({
  address,
  decimals,
});

describe('Migration #64', () => {
  const migrationVersion = 64;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: { backgroundState: { TokensController: null } },
      }),
      errorMessage: `Migration ${migrationVersion}: Invalid TokensController state: '${migrationVersion}'`,
      scenario: 'TokensController state is null',
    },
    {
      state: merge({}, initialRootState, {
        engine: { backgroundState: { TokensController: { allTokens: null } } },
      }),
      errorMessage: `Migration ${migrationVersion}: Missing allTokens property from TokensController: 'object'`,
      scenario: 'allTokens is null',
    },
  ];

  it.each(invalidStates)(
    'captures exception if $scenario',
    ({ errorMessage, state }) => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    },
  );

  it('removes tokens with decimals === null from allTokens, allDetectedTokens, tokens, and detectedTokens', () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {
              '1': {
                '0xAccount1': [
                  createToken('0xToken1', 18),
                  createToken('0xToken2', null), // Should be removed
                ],
              },
            },
            allDetectedTokens: {
              '1': {
                '0xAccount2': [
                  createToken('0xToken3', 18),
                  createToken('0xToken4', null), // Should be removed
                ],
              },
            },
            tokens: [
              createToken('0xToken5', 18),
              createToken('0xToken6', null), // Should be removed
            ],
            detectedTokens: [
              createToken('0xToken7', 18),
              createToken('0xToken8', null), // Should be removed
            ],
          },
        },
      },
    });

    const expectedState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {
              '1': {
                '0xAccount1': [createToken('0xToken1', 18)],
              },
            },
            allDetectedTokens: {
              '1': {
                '0xAccount2': [createToken('0xToken3', 18)],
              },
            },
            tokens: [createToken('0xToken5', 18)],
            detectedTokens: [createToken('0xToken7', 18)],
          },
        },
      },
    });

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(expectedState);

    // Verify that captureMessage was called for each removed token
    expect(mockedCaptureMessage).toHaveBeenCalledTimes(4);
    expect(mockedCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        `Removed token with decimals === null in allTokens`,
      ),
    );
    expect(mockedCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        `Removed token with decimals === null in allDetectedTokens`,
      ),
    );
    expect(mockedCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining(`Removed token with decimals === null in tokens`),
    );
    expect(mockedCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        `Removed token with decimals === null in detectedTokens`,
      ),
    );
  });
});
