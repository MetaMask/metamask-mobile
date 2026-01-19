import { ensureValidState, addFailoverUrlToNetworkConfiguration } from './';
import Logger from '../../../util/Logger';
import { captureException } from '@sentry/react-native';

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
const mockCaptureException = captureException as jest.MockedFunction<
  typeof captureException
>;

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

describe('addFailoverUrlToNetworkConfiguration', () => {
  const chainId = '0x8f';
  const migrationVersion = 109;
  const networkName = 'Monad';
  const quickNodeEnvVar = 'QUICKNODE_MONAD_URL';
  const quickNodeUrl = 'https://quicknode.monad.example.com';

  interface NetworkState {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: Record<
            string,
            {
              rpcEndpoints: Record<string, unknown>[];
            }
          >;
        };
      };
    };
  }

  const createNetworkState = (
    rpcEndpoints: Record<string, unknown>[],
    chainIdOverride?: string,
  ): NetworkState => ({
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: {
            [chainIdOverride || chainId]: {
              rpcEndpoints,
            },
          },
        },
      },
    },
  });

  const getNetworkConfig = (result: unknown, targetChainId = chainId) => {
    const state = result as NetworkState;
    return state.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId[targetChainId];
  };

  const callFunction = (state: unknown, envVarValue?: string): unknown => {
    if (envVarValue) {
      process.env[quickNodeEnvVar] = envVarValue;
    }
    return addFailoverUrlToNetworkConfiguration(
      state,
      chainId,
      migrationVersion,
      networkName,
      quickNodeEnvVar,
    );
  };

  const expectExceptionWithMessage = (message: string) => {
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(message),
      }),
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env[quickNodeEnvVar];
  });

  afterEach(() => {
    delete process.env[quickNodeEnvVar];
  });

  describe('Happy path', () => {
    it('adds failover URL to RPC endpoints and preserves existing properties', () => {
      const state = createNetworkState([
        {
          url: 'https://rpc.monad.example.com',
          timeout: 5000,
        },
        { url: 'https://rpc2.monad.example.com' },
      ]);

      const result = callFunction(state, quickNodeUrl);
      const config = getNetworkConfig(result);

      expect(config.rpcEndpoints[0].failoverUrls).toEqual([quickNodeUrl]);
      expect(config.rpcEndpoints[0].timeout).toBe(5000);
      expect(config.rpcEndpoints[1].failoverUrls).toEqual([quickNodeUrl]);
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('returns state unchanged when network is not configured', () => {
      const state: NetworkState = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {},
            },
          },
        },
      };

      const result = callFunction(state);

      expect(result).toBe(state);
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('skips adding failover URL when already present or env var missing', () => {
      const existingFailoverUrls = ['https://existing-failover.example.com'];
      const state1 = createNetworkState([
        {
          url: 'https://rpc.monad.example.com',
          failoverUrls: existingFailoverUrls,
        },
      ]);
      const state2 = createNetworkState([
        { url: 'https://rpc.monad.example.com' },
      ]);

      const result1 = callFunction(state1, quickNodeUrl);
      delete process.env[quickNodeEnvVar];
      const result2 = callFunction(state2);

      expect(getNetworkConfig(result1).rpcEndpoints[0].failoverUrls).toEqual(
        existingFailoverUrls,
      );
      expect(
        getNetworkConfig(result2).rpcEndpoints[0].failoverUrls,
      ).toBeUndefined();
    });

    it('skips invalid endpoints and adds failover URL to valid ones', () => {
      const state = createNetworkState([
        { url: 'https://rpc.monad.example.com' },
        { timeout: 5000 },
        { url: 12345 },
        'not an object' as unknown as Record<string, unknown>,
        { url: 'https://rpc2.monad.example.com', failoverUrls: [] },
      ]);

      const result = callFunction(state, quickNodeUrl);
      const config = getNetworkConfig(result);

      expect(config.rpcEndpoints[0].failoverUrls).toEqual([quickNodeUrl]);
      expect(config.rpcEndpoints[1].failoverUrls).toBeUndefined();
      expect(config.rpcEndpoints[2].failoverUrls).toBeUndefined();
      expect(config.rpcEndpoints[3]).toBe('not an object');
      expect(config.rpcEndpoints[4].failoverUrls).toEqual([quickNodeUrl]);
    });
  });

  describe('Validation errors', () => {
    it.each([
      ['not an object', 'FATAL ERROR: Migration 109: Invalid state error'],
      [{}, 'FATAL ERROR: Migration 109: Invalid engine state error'],
      [
        { engine: 'not an object' },
        'FATAL ERROR: Migration 109: Invalid engine state error',
      ],
      [
        { engine: {} },
        'FATAL ERROR: Migration 109: Invalid engine backgroundState error',
      ],
      [
        { engine: { backgroundState: {} } },
        'Invalid NetworkController state structure',
      ],
      [
        {
          engine: {
            backgroundState: { NetworkController: {} },
          },
        },
        'missing networkConfigurationsByChainId property',
      ],
      [
        {
          engine: {
            backgroundState: {
              NetworkController: {
                networkConfigurationsByChainId: {
                  [chainId]: { rpcEndpoints: 'not an array' },
                },
              },
            },
          },
        },
        'Invalid Monad network rpcEndpoints: expected array',
      ],
    ])('captures exception for invalid structure', (state, expectedMessage) => {
      const result = callFunction(state);

      expect(result).toBe(state);
      expectExceptionWithMessage(expectedMessage);
    });
  });

  describe('Error handling', () => {
    it('captures exception and returns state when error occurs', () => {
      const state = createNetworkState([
        { url: 'https://rpc.monad.example.com' },
      ]);
      const networkConfig = getNetworkConfig(state);
      Object.defineProperty(networkConfig, 'rpcEndpoints', {
        get: () => {
          throw new Error('Access error');
        },
        configurable: true,
      });

      const result = callFunction(state, quickNodeUrl);

      expect(result).toBe(state);
      expectExceptionWithMessage(
        `Failed to add failoverUrls to ${networkName} network configuration`,
      );
    });
  });
});
