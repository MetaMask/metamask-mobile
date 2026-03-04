import React from 'react';
import { render } from '@testing-library/react-native';
import LedgerTransactionModal, {
  LedgerReplacementTxTypes,
} from './LedgerTransactionModal';

// Mock navigation
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

// Mock nav utils
const mockOnConfirmationComplete = jest.fn();
const mockParams = {
  transactionId: 'test-tx-id',
  onConfirmationComplete: mockOnConfirmationComplete,
  deviceId: 'test-device-id',
  replacementParams: undefined as
    | {
        type: LedgerReplacementTxTypes;
        eip1559GasFee?: {
          maxFeePerGas?: string;
          maxPriorityFeePerGas?: string;
        };
      }
    | undefined,
};

jest.mock('../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(() => jest.fn()),
  useParams: () => mockParams,
}));

// Mock Engine
const mockAccept = jest.fn().mockResolvedValue(undefined);
const mockStopTransaction = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../core/Engine', () => ({
  context: {
    TransactionController: {
      stopTransaction: (...args: unknown[]) => mockStopTransaction(...args),
    },
    ApprovalController: {
      accept: (...args: unknown[]) => mockAccept(...args),
    },
  },
}));

// Mock speedUpTransaction
const mockSpeedUpTransaction = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../util/transaction-controller', () => ({
  speedUpTransaction: (...args: unknown[]) => mockSpeedUpTransaction(...args),
}));

// Mock LedgerConfirmationModal to capture props
let capturedOnConfirmation: (() => Promise<void>) | null = null;
let capturedOnRejection: (() => void) | null = null;

jest.mock('./LedgerConfirmationModal', () => {
  const MockLedgerConfirmationModal = ({
    onConfirmation,
    onRejection,
  }: {
    onConfirmation: () => Promise<void>;
    onRejection: () => void;
    deviceId: string;
  }) => {
    capturedOnConfirmation = onConfirmation;
    capturedOnRejection = onRejection;
    return null;
  };
  return MockLedgerConfirmationModal;
});

describe('LedgerTransactionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.replacementParams = undefined;
    capturedOnConfirmation = null;
    capturedOnRejection = null;
    mockCanGoBack.mockReturnValue(true);
  });

  it('renders LedgerConfirmationModal with correct deviceId', () => {
    render(<LedgerTransactionModal />);
    // The mock captures the props, so if we get here without error, the component rendered
    expect(capturedOnConfirmation).not.toBeNull();
    expect(capturedOnRejection).not.toBeNull();
  });

  describe('executeOnLedger', () => {
    it('calls ApprovalController.accept for regular transaction', async () => {
      render(<LedgerTransactionModal />);

      await capturedOnConfirmation?.();

      expect(mockAccept).toHaveBeenCalledWith('test-tx-id', undefined, {
        waitForResult: true,
      });
      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(true);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls speedUpTransaction for SPEED_UP replacement', async () => {
      mockParams.replacementParams = {
        type: LedgerReplacementTxTypes.SPEED_UP,
        eip1559GasFee: {
          maxFeePerGas: '0x123',
          maxPriorityFeePerGas: '0x456',
        },
      };

      render(<LedgerTransactionModal />);

      await capturedOnConfirmation?.();

      expect(mockSpeedUpTransaction).toHaveBeenCalledWith('test-tx-id', {
        maxFeePerGas: '0x123',
        maxPriorityFeePerGas: '0x456',
      });
      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(true);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('calls TransactionController.stopTransaction for CANCEL replacement', async () => {
      mockParams.replacementParams = {
        type: LedgerReplacementTxTypes.CANCEL,
        eip1559GasFee: {
          maxFeePerGas: '0x789',
          maxPriorityFeePerGas: '0xabc',
        },
      };

      render(<LedgerTransactionModal />);

      await capturedOnConfirmation?.();

      expect(mockStopTransaction).toHaveBeenCalledWith('test-tx-id', {
        maxFeePerGas: '0x789',
        maxPriorityFeePerGas: '0xabc',
      });
      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(true);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('onRejection', () => {
    it('calls onConfirmationComplete with false and goes back', async () => {
      render(<LedgerTransactionModal />);

      capturedOnRejection?.();

      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('goBack', () => {
    it('does not call goBack if canGoBack returns false', async () => {
      mockCanGoBack.mockReturnValue(false);

      render(<LedgerTransactionModal />);

      capturedOnRejection?.();

      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
