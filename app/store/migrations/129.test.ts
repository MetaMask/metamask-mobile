import migrate from './129';
import { ensureValidState, ValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

describe('migration 129', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not modify the state if `ensureValidState` returns `false`', () => {
    const state = { some: 'state' };
    jest.mocked(ensureValidState).mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('moves `SnapsRegistry` state to `SnapRegistryController`', () => {
    const oldState = {
      engine: {
        backgroundState: {
          SnapsRegistry: {
            some: 'data',
          },
        },
      },
    };

    jest.mocked(ensureValidState).mockReturnValue(true);

    const state = migrate(oldState) as ValidState;
    expect(state.engine.backgroundState).not.toHaveProperty('SnapsRegistry');
    expect(state).toStrictEqual({
      engine: {
        backgroundState: {
          SnapRegistryController: {
            some: 'data',
          },
        },
      },
    });
  });
});
