import { captureException } from '@sentry/react-native';
import migrate from './118';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

interface TestState {
  engine: {
    backgroundState: {
      PerpsController?: {
        withdrawalRequests?: unknown[];
        depositRequests?: unknown[];
        withdrawalProgress?: {
          progress: number;
          lastUpdated: number;
          activeWithdrawalId: string | null;
        };
        withdrawInProgress?: boolean;
        depositInProgress?: boolean;
        activeProvider?: string;
        isTestnet?: boolean;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
}

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

describe('Migration 118: Clear deposit and withdrawal request queues from PerpsController', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged if PerpsController does not exist', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          OtherController: { someData: true },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(state) as TestState;

    expect(result).toBe(state);
    expect(result.engine.backgroundState.PerpsController).toBeUndefined();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged if PerpsController is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: 'invalid',
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  describe('clears request queues', () => {
    it('clears withdrawalRequests to empty array', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [
                {
                  id: 'withdrawal-1',
                  status: 'pending',
                  amount: '100',
                },
                {
                  id: 'withdrawal-2',
                  status: 'completed',
                  amount: '200',
                },
              ],
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawalRequests,
      ).toEqual([]);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('clears depositRequests to empty array', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              depositRequests: [
                {
                  id: 'deposit-1',
                  status: 'pending',
                  amount: '100',
                },
                {
                  id: 'deposit-2',
                  status: 'completed',
                  amount: '200',
                },
              ],
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.depositRequests,
      ).toEqual([]);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('clears both withdrawalRequests and depositRequests', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [
                { id: 'withdrawal-1', status: 'pending' },
                { id: 'withdrawal-2', status: 'bridging' },
                { id: 'withdrawal-3', status: 'completed' },
              ],
              depositRequests: [
                { id: 'deposit-1', status: 'pending' },
                { id: 'deposit-2', status: 'completed' },
              ],
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawalRequests,
      ).toEqual([]);
      expect(
        result.engine.backgroundState.PerpsController?.depositRequests,
      ).toEqual([]);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('resets progress and flags', () => {
    it('resets withdrawalProgress', () => {
      const mockNow = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [],
              withdrawalProgress: {
                progress: 75,
                lastUpdated: 1234567800,
                activeWithdrawalId: 'withdrawal-1',
              },
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawalProgress,
      ).toEqual({
        progress: 0,
        lastUpdated: mockNow,
        activeWithdrawalId: null,
      });
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('resets withdrawInProgress to false', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [],
              withdrawInProgress: true,
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawInProgress,
      ).toBe(false);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('resets depositInProgress to false', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              depositRequests: [],
              depositInProgress: true,
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.depositInProgress,
      ).toBe(false);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('handles missing properties', () => {
    it('handles missing withdrawalRequests property', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              depositRequests: [{ id: 'deposit-1', status: 'pending' }],
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawalRequests,
      ).toBeUndefined();
      expect(
        result.engine.backgroundState.PerpsController?.depositRequests,
      ).toEqual([]);
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('handles missing depositRequests property', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [{ id: 'withdrawal-1', status: 'pending' }],
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawalRequests,
      ).toEqual([]);
      expect(
        result.engine.backgroundState.PerpsController?.depositRequests,
      ).toBeUndefined();
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('does not add withdrawalProgress if not present', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [],
              activeProvider: 'hyperliquid',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.withdrawalProgress,
      ).toBeUndefined();
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('preserves other properties', () => {
    it('preserves other PerpsController properties', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [{ id: 'withdrawal-1', status: 'pending' }],
              depositRequests: [{ id: 'deposit-1', status: 'pending' }],
              activeProvider: 'hyperliquid',
              isTestnet: false,
              someOtherProperty: 'preserved',
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(
        result.engine.backgroundState.PerpsController?.activeProvider,
      ).toBe('hyperliquid');
      expect(result.engine.backgroundState.PerpsController?.isTestnet).toBe(
        false,
      );
      expect(
        result.engine.backgroundState.PerpsController?.someOtherProperty,
      ).toBe('preserved');
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });

    it('preserves other controllers in backgroundState', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [{ id: 'withdrawal-1', status: 'pending' }],
            },
            OtherController: {
              shouldStayUntouched: true,
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state) as TestState;

      expect(result.engine.backgroundState.OtherController).toEqual({
        shouldStayUntouched: true,
      });
      expect(mockedCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles error during migration and captures exception', () => {
      const state: TestState = {
        engine: {
          backgroundState: {
            PerpsController: {
              withdrawalRequests: [],
            },
          },
        },
      };

      // Mock an error by making the property throw when accessed
      Object.defineProperty(
        state.engine.backgroundState.PerpsController,
        'withdrawalRequests',
        {
          get() {
            throw new Error('Test error');
          },
          configurable: true,
        },
      );

      mockedEnsureValidState.mockReturnValue(true);

      const result = migrate(state);

      expect(result).toBe(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'Migration 118: Failed to clear transaction request queues',
          ),
        }),
      );
    });
  });
});
