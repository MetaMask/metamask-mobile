import migrate from './070';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

describe('Migration 070: Remove staking reducer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes staking key from state if it exists', () => {
    const state = {
      staking: {
        someData: 'value',
      },
      otherKey: 'should remain',
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // Staking key should be removed
    expect(migratedState).not.toHaveProperty('staking');

    // Other keys should remain
    expect(migratedState).toHaveProperty('otherKey', 'should remain');

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify state if staking key does not exist', () => {
    const state = {
      someKey: 'value',
      otherKey: 'should remain',
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
