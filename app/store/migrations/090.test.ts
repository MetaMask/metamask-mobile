import { captureException } from '@sentry/react-native';
import { hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';
import migrate from './090';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  hasProperty: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedHasProperty = jest.mocked(hasProperty);

describe('Migration 090', () => {
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

  it('removes alert state when it exists in the state', () => {
    const state = {
      alert: {
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: 'Public address copied to clipboard' },
      },
      user: { existingUser: true },
      settings: { theme: 'dark' },
      engine: { backgroundState: {} },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedHasProperty.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual({
      user: { existingUser: true },
      settings: { theme: 'dark' },
      engine: { backgroundState: {} },
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles empty state object', () => {
    const state = {};

    mockedEnsureValidState.mockReturnValue(true);
    mockedHasProperty.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles state with null alert property', () => {
    const state = {
      alert: null,
      user: { existingUser: true },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedHasProperty.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual({
      user: { existingUser: true },
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when alert state does not exist', () => {
    const state = {
      user: { existingUser: true },
      settings: { theme: 'dark' },
      engine: { backgroundState: {} },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedHasProperty.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception and returns original state when an error occurs', () => {
    const state = {
      alert: {
        isVisible: true,
        content: 'clipboard-alert',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedHasProperty.mockImplementation(() => {
      throw new Error('Unexpected error during property check');
    });

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        'Migration 090: Failed to remove alert state from persisted data: Error: Unexpected error during property check',
      ),
    );
  });
});
