import { captureException } from '@sentry/react-native';
import migrate from './112';
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
        withdrawalRequests?: {
          id: string;
          status: string;
          amount: string;
          asset: string;
          accountAddress: string;
          timestamp: number;
          txHash?: string;
        }[];
        withdrawalProgress?: {
          progress: number;
          lastUpdated: number;
          activeWithdrawalId: string | null;
        };
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

describe('Migration 112: Clear stuck pending withdrawal requests from PerpsController', () => {
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

  it('returns state unchanged if withdrawalRequests does not exist', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'hyperliquid',
            isTestnet: false,
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(state) as TestState;

    expect(result).toBe(state);
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests,
    ).toBeUndefined();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged if withdrawalRequests is not an array', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: 'not-an-array',
            activeProvider: 'hyperliquid',
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes pending withdrawal requests', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
              {
                id: 'withdrawal-2',
                status: 'completed',
                amount: '200',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567891,
                txHash: '0xabc',
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
    ).toHaveLength(1);
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests?.[0].id,
    ).toBe('withdrawal-2');
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests?.[0]
        .status,
    ).toBe('completed');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes bridging withdrawal requests', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'bridging',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
              {
                id: 'withdrawal-2',
                status: 'completed',
                amount: '200',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567891,
                txHash: '0xabc',
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
    ).toHaveLength(1);
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests?.[0].id,
    ).toBe('withdrawal-2');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes both pending and bridging withdrawal requests', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
              {
                id: 'withdrawal-2',
                status: 'bridging',
                amount: '150',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567891,
              },
              {
                id: 'withdrawal-3',
                status: 'completed',
                amount: '200',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567892,
                txHash: '0xabc',
              },
              {
                id: 'withdrawal-4',
                status: 'failed',
                amount: '50',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567893,
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
    ).toHaveLength(2);
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests?.map(
        (w) => w.id,
      ),
    ).toEqual(['withdrawal-3', 'withdrawal-4']);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('preserves completed and failed withdrawal requests', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'completed',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
                txHash: '0xabc',
              },
              {
                id: 'withdrawal-2',
                status: 'failed',
                amount: '200',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567891,
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
    ).toHaveLength(2);
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests?.map(
        (w) => w.status,
      ),
    ).toEqual(['completed', 'failed']);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('clears array when all withdrawals are pending/bridging', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
              {
                id: 'withdrawal-2',
                status: 'bridging',
                amount: '200',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567891,
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
    ).toHaveLength(0);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles empty withdrawalRequests array', () => {
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
      result.engine.backgroundState.PerpsController?.withdrawalRequests,
    ).toHaveLength(0);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes invalid entries without status property', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              { id: 'invalid-1', amount: '100' }, // missing status
              {
                id: 'valid-1',
                status: 'completed',
                amount: '200',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567891,
              },
              null, // null entry
              'string-entry', // invalid type
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
    ).toHaveLength(1);
    expect(
      result.engine.backgroundState.PerpsController?.withdrawalRequests?.[0].id,
    ).toBe('valid-1');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('preserves other PerpsController properties', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
            ],
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
      result.engine.backgroundState.PerpsController?.withdrawalRequests,
    ).toHaveLength(0);
    expect(result.engine.backgroundState.PerpsController?.activeProvider).toBe(
      'hyperliquid',
    );
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
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
            ],
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

  it('resets withdrawalProgress when removing pending withdrawals', () => {
    const mockNow = 1700000000000;
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);

    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
              },
            ],
            withdrawalProgress: {
              progress: 50,
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

  it('leaves withdrawalProgress unchanged if not present', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            withdrawalRequests: [
              {
                id: 'withdrawal-1',
                status: 'pending',
                amount: '100',
                asset: 'USDC',
                accountAddress: '0x123',
                timestamp: 1234567890,
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
      result.engine.backgroundState.PerpsController?.withdrawalProgress,
    ).toBeUndefined();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

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
          'Migration 112: Failed to clear stuck pending withdrawal requests',
        ),
      }),
    );
  });
});
