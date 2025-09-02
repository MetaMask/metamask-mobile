import { ensureValidState } from './';
import Logger from '../../../util/Logger';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;
const mockLogger = Logger.log as jest.MockedFunction<typeof Logger.log>;

describe('ensureValidState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('return false for non-object states', () => {
    const state = 'not an object';
    const result = ensureValidState(state, 1);
    expect(result).toBe(false);
  });

  it('return false if state.engine is not an object', () => {
    const state = { engine: 'not an object' };
    const result = ensureValidState(state, 1);
    expect(result).toBe(false);
  });

  it('return false if state.engine.backgroundState is not an object', () => {
    const state = { engine: { backgroundState: 'not an object' } };
    const result = ensureValidState(state, 1);
    expect(result).toBe(false);
  });

  it('return true for valid state objects', () => {
    const state = { engine: { backgroundState: {} } };
    const result = ensureValidState(state, 1);
    expect(result).toBe(true);
  });

  describe('Vault logging for existing users', () => {
    const createValidStateWithVault = (overrides = {}) => ({
      engine: {
        backgroundState: {
          KeyringController: {
            vault: 'encrypted_vault_data',
          },
        },
      },
      user: {
        existingUser: true,
      },
      ...overrides,
    });

    it('log vault existence when existingUser is true and vault exists', () => {
      const state = createValidStateWithVault();
      const migrationNumber = 10;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'Is vault defined at KeyringController at migration when existingUser',
        true,
      );
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('log vault missing when existingUser is true but vault does not exist', () => {
      const state = createValidStateWithVault({
        engine: {
          backgroundState: {
            KeyringController: {},
          },
        },
      });
      const migrationNumber = 11;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'Is vault defined at KeyringController at migration when existingUser',
        false,
      );
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('log vault missing when KeyringController is entirely missing', () => {
      const state = createValidStateWithVault({
        engine: {
          backgroundState: {},
        },
      });
      const migrationNumber = 12;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'Is vault defined at KeyringController at migration when existingUser',
        false,
      );
    });

    it('handle vault being null', () => {
      const state = createValidStateWithVault({
        engine: {
          backgroundState: {
            KeyringController: {
              vault: null,
            },
          },
        },
      });
      const migrationNumber = 13;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'Is vault defined at KeyringController at migration when existingUser',
        false,
      );
    });

    it('handle vault being empty string', () => {
      const state = createValidStateWithVault({
        engine: {
          backgroundState: {
            KeyringController: {
              vault: '',
            },
          },
        },
      });
      const migrationNumber = 14;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'Is vault defined at KeyringController at migration when existingUser',
        false,
      );
    });

    it('not log vault status when existingUser is false', () => {
      const state = createValidStateWithVault({
        user: {
          existingUser: false,
        },
      });
      const migrationNumber = 15;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).not.toHaveBeenCalled();
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('not log vault status when existingUser is undefined', () => {
      const state = createValidStateWithVault({
        user: {},
      });
      const migrationNumber = 16;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).not.toHaveBeenCalled();
    });

    it('not log vault status when user object is missing', () => {
      const state = {
        engine: {
          backgroundState: {
            KeyringController: {
              vault: 'encrypted_vault_data',
            },
          },
        },
        settings: {},
        security: {},
      };
      const migrationNumber = 17;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).not.toHaveBeenCalled();
    });

    it('not log vault status when user is not an object', () => {
      const state = createValidStateWithVault({
        user: 'not an object',
      });
      const migrationNumber = 18;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).not.toHaveBeenCalled();
    });

    it('not log vault status when existingUser is not exactly true', () => {
      const state = createValidStateWithVault({
        user: {
          existingUser: 'yes', // String instead of boolean
        },
      });
      const migrationNumber = 19;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).not.toHaveBeenCalled();
    });

    it('handle KeyringController not being an object', () => {
      const state = createValidStateWithVault({
        engine: {
          backgroundState: {
            KeyringController: 'not an object',
          },
        },
      });
      const migrationNumber = 20;

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'Is vault defined at KeyringController at migration when existingUser',
        false,
      );
    });
  });

  describe('Error handling in vault logging', () => {
    const createValidStateWithVault = () => ({
      engine: {
        backgroundState: {
          KeyringController: {
            vault: 'encrypted_vault_data',
          },
        },
      },
      user: {
        existingUser: true,
      },
      settings: {},
      security: {},
    });

    it('handle Logger.log throwing an error and log to Sentry', () => {
      const state = createValidStateWithVault();
      const migrationNumber = 21;
      const logError = new Error('Logger failed');
      mockLogger.mockImplementationOnce(() => {
        throw logError;
      });

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationNumber}: Failed to log vault status: Logger failed`,
        ),
      );
    });

    it('handle non-Error objects being thrown', () => {
      const state = createValidStateWithVault();
      const migrationNumber = 22;
      mockLogger.mockImplementationOnce(() => {
        throw 'String error';
      });

      const result = ensureValidState(state, migrationNumber);

      expect(result).toBe(true);
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationNumber}: Failed to log vault status: Unknown error`,
        ),
      );
    });

    it('handle captureException itself throwing an error', () => {
      const state = createValidStateWithVault();
      const migrationNumber = 23;
      mockLoggerError.mockImplementationOnce(() => {
        throw new Error('Sentry failed');
      });

      const result = ensureValidState(state, migrationNumber);
      expect(result).toBe(true);
    });

    it('handle circular references gracefully', () => {
      const circularState: Record<string, unknown> =
        createValidStateWithVault();
      circularState.circular = circularState;
      const migrationNumber = 24;

      const result = ensureValidState(circularState, migrationNumber);
      expect(result).toBe(true);
    });
  });
});
