import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './164';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createState = (backgroundState: Record<string, unknown>) => ({
  engine: { backgroundState },
});

describe(`Migration ${migrationVersion}: remove TokensController state`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 164', () => {
    expect(migrationVersion).toBe(164);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { some: 'state' };

    expect(migrate(state)).toBe(state);
    expect(mockedEnsureValidState).toHaveBeenCalledWith(state, 164);
  });

  it('returns state unchanged when TokensController is absent', () => {
    const state = createState({ AssetsController: { assetsInfo: {} } });

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes TokensController and preserves other controllers', () => {
    const state = createState({
      TokensController: { allTokens: { '0x1': { '0xabc': [] } } },
      AssetsController: { assetsInfo: { 'eip155:1/slip44:60': {} } },
      NetworkController: { selectedNetworkClientId: 'mainnet' },
    });

    expect(migrate(state)).toStrictEqual({
      engine: {
        backgroundState: {
          AssetsController: { assetsInfo: { 'eip155:1/slip44:60': {} } },
          NetworkController: { selectedNetworkClientId: 'mainnet' },
        },
      },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures the error and returns state unchanged when the migration throws', () => {
    const state = createState({ TokensController: { allTokens: {} } });
    Object.defineProperty(state.engine, 'backgroundState', {
      get: () => {
        throw new Error('boom');
      },
    });

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: Failed to remove TokensController state: boom`,
      ),
    );
  });
});
