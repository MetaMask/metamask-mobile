import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { usePredictDepositToasts } from './usePredictDepositToasts';
import Engine from '../../../../core/Engine';
import { PredictDepositStatus } from '../types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearDepositTransaction: jest.fn(),
    },
  },
}));

// Mock Alert
const mockAlert = jest.fn();
Alert.alert = mockAlert;

// Mock react-redux
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = {
  engine: {
    backgroundState: {
      PredictController: {
        depositTransaction: null,
      },
    },
  },
};

jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: jest.fn((selector: any) => selector(mockState)),
}));

// Helper to create mock deposit transaction
function createMockDepositTransaction(overrides = {}) {
  return {
    batchId: 'batch-123',
    chainId: 137,
    status: PredictDepositStatus.PENDING,
    providerId: 'polymarket',
    ...overrides,
  };
}

describe('usePredictDepositStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    (
      Engine.context.PredictController.clearDepositTransaction as jest.Mock
    ).mockClear();
    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            depositTransaction: null,
          },
        },
      },
    };
  });

  describe('initialization', () => {
    it('does not trigger any action when depositTransaction is null', () => {
      renderHook(() => usePredictDepositToasts());

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(
        Engine.context.PredictController.clearDepositTransaction,
      ).not.toHaveBeenCalled();
    });

    it('does not trigger alert on initial pending status', () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      renderHook(() => usePredictDepositToasts());

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('success handling', () => {
    it('shows success alert when status changes to CONFIRMED', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to CONFIRMED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Deposit Successful',
          'Your funds are now available',
        );
      });
    });

    it('calls onSuccess callback when status changes to CONFIRMED', async () => {
      const onSuccess = jest.fn();

      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to CONFIRMED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('clears deposit transaction after showing success', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to CONFIRMED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.clearDepositTransaction,
        ).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('shows error alert when status changes to ERROR', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to ERROR
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.ERROR,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Deposit Failed',
          'Failed to complete deposit',
        );
      });
    });

    it('calls onError callback when status changes to ERROR', async () => {
      const onError = jest.fn();

      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to ERROR
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.ERROR,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('clears deposit transaction after showing error', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to ERROR
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.ERROR,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.clearDepositTransaction,
        ).toHaveBeenCalled();
      });
    });
  });

  describe('cancelled handling', () => {
    it('clears deposit transaction when status changes to CANCELLED without showing alert', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to CANCELLED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CANCELLED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.clearDepositTransaction,
        ).toHaveBeenCalled();
      });

      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('status change detection', () => {
    it('does not trigger alert if status remains the same', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Clear previous calls
      (Alert.alert as jest.Mock).mockClear();
      (
        Engine.context.PredictController.clearDepositTransaction as jest.Mock
      ).mockClear();

      // Re-render with same status
      await act(async () => {
        rerender({});
      });

      // Should not trigger again
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('handles transition from null to status correctly', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: null,
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change from null to CONFIRMED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Deposit Successful',
          'Your funds are now available',
        );
      });
    });

    it('resets previous status when transaction becomes null', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Transaction becomes null
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: null,
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      // Now set to CONFIRMED again - should trigger alert
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      (Alert.alert as jest.Mock).mockClear();

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('callbacks', () => {
    it('works without callbacks provided', async () => {
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to CONFIRMED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Should not throw error
    });

    it('only calls onSuccess, not onError, for success case', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to CONFIRMED
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.CONFIRMED,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('only calls onError, not onSuccess, for error case', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.PENDING,
              }),
            },
          },
        },
      };

      const { rerender } = renderHook(() => usePredictDepositToasts());

      // Change status to ERROR
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              depositTransaction: createMockDepositTransaction({
                status: PredictDepositStatus.ERROR,
              }),
            },
          },
        },
      };

      await act(async () => {
        rerender({});
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
