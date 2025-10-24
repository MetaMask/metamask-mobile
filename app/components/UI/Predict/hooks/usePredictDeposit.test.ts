import { renderHook } from '@testing-library/react-native';
import { usePredictDeposit } from './usePredictDeposit';
import Engine from '../../../../core/Engine';
import { PredictDepositStatus } from '../types';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      depositWithConfirmation: jest.fn(),
    },
  },
}));

// Mock useConfirmNavigation
const mockNavigateToConfirmation = jest.fn();
const mockConfirmNavigationResult = {
  navigateToConfirmation: mockNavigateToConfirmation,
};
jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: () => mockConfirmNavigationResult,
}));

// Mock usePredictEligibility
const mockEligibilityResult = { isEligible: true };
jest.mock('./usePredictEligibility', () => ({
  usePredictEligibility: () => mockEligibilityResult,
}));

// Mock useNavigation
const mockNavigate = jest.fn();
const mockNavigationResult = {
  navigate: mockNavigate,
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigationResult,
}));

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

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSelector: jest.fn((selector: any) => selector(mockState)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connect: () => (component: any) => component,
  };
});

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

// Helper to setup test
function setupUsePredictDepositTest(stateOverrides = {}, hookOptions = {}) {
  jest.clearAllMocks();
  mockState = {
    engine: {
      backgroundState: {
        PredictController: {
          depositTransaction: null,
          ...stateOverrides,
        },
      },
    },
  };
  return renderHook(() => usePredictDeposit(hookOptions));
}

describe('usePredictDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateToConfirmation.mockClear();
    mockNavigate.mockClear();
    mockEligibilityResult.isEligible = true;
    (
      Engine.context.PredictController.depositWithConfirmation as jest.Mock
    ).mockClear();
  });

  describe('initial state', () => {
    it('returns correct initial state when no deposit transaction exists', () => {
      const { result } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();
      expect(typeof result.current.deposit).toBe('function');
    });

    it('returns deposit function that is callable', () => {
      const { result } = setupUsePredictDepositTest();

      expect(result.current.deposit).toBeDefined();
      expect(typeof result.current.deposit).toBe('function');
    });
  });

  describe('status from depositTransaction', () => {
    it('returns confirmed status when transaction is confirmed', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.CONFIRMED,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.CONFIRMED);
    });

    it('returns pending status when transaction is pending', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.PENDING,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.PENDING);
    });

    it('returns error status when transaction has error status', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.ERROR,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.ERROR);
    });

    it('handles null transaction correctly', () => {
      const { result } = setupUsePredictDepositTest({
        depositTransaction: null,
      });

      expect(result.current.status).toBeUndefined();
    });

    it('returns cancelled status when transaction is cancelled', () => {
      const depositTransaction = createMockDepositTransaction({
        status: PredictDepositStatus.CANCELLED,
      });

      const { result } = setupUsePredictDepositTest({ depositTransaction });

      expect(result.current.status).toBe(PredictDepositStatus.CANCELLED);
    });
  });

  describe('deposit function', () => {
    it('navigates to unavailable modal when user is not eligible', async () => {
      mockEligibilityResult.isEligible = false;

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockNavigate).toHaveBeenCalledWith('PredictModals', {
        screen: 'PredictUnavailable',
      });
      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).not.toHaveBeenCalled();
    });

    it('calls navigateToConfirmation with correct params when eligible', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
        loader: ConfirmationLoader.CustomAmount,
      });
    });

    it('calls depositWithConfirmation with default providerId', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('calls depositWithConfirmation with custom providerId', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({
        success: true,
        response: { batchId: 'batch-123' },
      });

      const { result } = setupUsePredictDepositTest(
        {},
        { providerId: 'custom-provider' },
      );

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'custom-provider',
      });
    });

    it('handles depositWithConfirmation error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue(new Error('Deposit failed'));

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize deposit:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles navigation error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNavigateToConfirmation.mockImplementationOnce(() => {
        throw new Error('Navigation failed');
      });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to proceed with deposit:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('hook stability', () => {
    it('returns stable deposit function reference across re-renders', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      const initialDeposit = result.current.deposit;

      rerender({});

      expect(result.current.deposit).toBe(initialDeposit);
    });

    it('updates status when depositTransaction changes', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Update state with pending transaction
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

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.PENDING);
    });
  });

  describe('state transitions', () => {
    it('updates status when depositTransaction changes to confirmed', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Update state with confirmed transaction
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

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.CONFIRMED);
    });

    it('updates status when depositTransaction changes to pending', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Add pending transaction
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

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.PENDING);
    });

    it('updates status when depositTransaction changes to error', () => {
      const { result, rerender } = setupUsePredictDepositTest();

      expect(result.current.status).toBeUndefined();

      // Add error transaction
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

      rerender({});

      expect(result.current.status).toBe(PredictDepositStatus.ERROR);
    });
  });

  describe('providerId handling', () => {
    it('uses default providerId polymarket when not specified', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = setupUsePredictDepositTest();

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('uses custom providerId when provided', async () => {
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue({ success: true });

      const { result } = setupUsePredictDepositTest(
        {},
        { providerId: 'test-provider' },
      );

      await result.current.deposit();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'test-provider',
      });
    });
  });
});
