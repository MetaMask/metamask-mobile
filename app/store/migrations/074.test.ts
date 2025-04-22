import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
import migrate from './074';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = () => ({
  engine: {
    backgroundState: {
      TokensController: {
        tokens: ['token1', 'token2'],
        detectedTokens: ['token1'],
        ignoredTokens: ['token2'],
      },
      AccountTrackerController: {
        accounts: ['account1', 'account2'],
      },
      TokenListController: {
        tokenList: ['token1', 'token2'],
      },
    },
  },
});

describe('Migration 74: Remove specific properties from controllers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes scoped state', () => {
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          TokensController: {},
          AccountTrackerController: {},
          TokenListController: {},
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokensController: 'invalid',
          },
        },
      },
      test: 'invalid TokensController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            AccountTrackerController: 'invalid',
          },
        },
      },
      test: 'invalid AccountTrackerController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenListController: 'invalid',
          },
        },
      },
      test: 'invalid TokenListController state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
