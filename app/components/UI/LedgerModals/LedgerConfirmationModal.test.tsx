import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { act } from '@testing-library/react-hooks';
import LedgerConfirmationModal from './LedgerConfirmationModal';
import { MetaMetricsEvents } from '../../../core/Analytics';

// Mock useMetrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Mock HardwareWallet hooks
const mockEnsureDeviceReady = jest.fn();
const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockIsUserCancellation = jest.fn();

jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWalletActions: () => ({
    ensureDeviceReady: mockEnsureDeviceReady,
    showAwaitingConfirmation: mockShowAwaitingConfirmation,
    hideAwaitingConfirmation: mockHideAwaitingConfirmation,
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
  isUserCancellation: (error: unknown) => mockIsUserCancellation(error),
}));

describe('LedgerConfirmationModal', () => {
  const defaultProps = {
    onConfirmation: jest.fn().mockResolvedValue(undefined),
    onRejection: jest.fn(),
    deviceId: 'test-device-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureDeviceReady.mockResolvedValue(true);
    mockIsUserCancellation.mockReturnValue(false);
  });

  it('renders nothing (null)', () => {
    const { toJSON } = render(<LedgerConfirmationModal {...defaultProps} />);
    expect(toJSON()).toBeNull();
  });

  describe('successful signing flow', () => {
    it('executes the full signing flow when device is ready', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockEnsureDeviceReady).toHaveBeenCalledWith('test-device-id');
      });

      await waitFor(() => {
        expect(mockShowAwaitingConfirmation).toHaveBeenCalledWith(
          'transaction',
          expect.any(Function),
        );
      });

      await waitFor(() => {
        expect(defaultProps.onConfirmation).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockHideAwaitingConfirmation).toHaveBeenCalled();
      });
    });

    it('uses message operationType when provided', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);

      render(
        <LedgerConfirmationModal {...defaultProps} operationType="message" />,
      );

      await waitFor(() => {
        expect(mockShowAwaitingConfirmation).toHaveBeenCalledWith(
          'message',
          expect.any(Function),
        );
      });
    });
  });

  describe('device not ready', () => {
    it('calls onRejection when device is not ready', async () => {
      mockEnsureDeviceReady.mockResolvedValue(false);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onRejection).toHaveBeenCalled();
      });

      // Should not proceed with signing
      expect(mockShowAwaitingConfirmation).not.toHaveBeenCalled();
      expect(defaultProps.onConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('signing errors', () => {
    it('shows error UI and calls onRejection when signing fails', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);
      const signingError = new Error('Signing failed');
      defaultProps.onConfirmation.mockRejectedValueOnce(signingError);
      mockIsUserCancellation.mockReturnValue(false);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockHideAwaitingConfirmation).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockShowHardwareWalletError).toHaveBeenCalledWith(signingError);
      });

      await waitFor(() => {
        expect(defaultProps.onRejection).toHaveBeenCalled();
      });
    });

    it('does not show error UI for user cancellation during signing', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);
      const userCancelError = new Error('User cancelled');
      defaultProps.onConfirmation.mockRejectedValueOnce(userCancelError);
      mockIsUserCancellation.mockReturnValue(true);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockHideAwaitingConfirmation).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(defaultProps.onRejection).toHaveBeenCalled();
      });

      // Should NOT show error UI for user cancellation
      expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    });
  });

  describe('connection errors', () => {
    it('shows error UI and calls onRejection when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockEnsureDeviceReady.mockRejectedValue(connectionError);
      mockIsUserCancellation.mockReturnValue(false);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockShowHardwareWalletError).toHaveBeenCalledWith(
          connectionError,
        );
      });

      await waitFor(() => {
        expect(defaultProps.onRejection).toHaveBeenCalled();
      });
    });

    it('does not show error UI for user cancellation during connection', async () => {
      const userCancelError = new Error('User cancelled');
      mockEnsureDeviceReady.mockRejectedValue(userCancelError);
      mockIsUserCancellation.mockReturnValue(true);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onRejection).toHaveBeenCalled();
      });

      // Should NOT show error UI for user cancellation
      expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('tracks HARDWARE_WALLET_ERROR when signing fails with non-user error', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);
      const error = new Error('Hardware error');
      defaultProps.onConfirmation.mockRejectedValueOnce(error);
      mockIsUserCancellation.mockReturnValue(false);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_ERROR,
      );
    });

    it('tracks DAPP_TRANSACTION_CANCELLED when handleRejection is called without error', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockShowAwaitingConfirmation).toHaveBeenCalled();
      });

      // Get the cancel callback and invoke it
      const cancelCallback = mockShowAwaitingConfirmation.mock.calls[0][1];
      await act(async () => {
        cancelCallback();
      });

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
        );
      });
    });

    it('does not track error analytics for user cancellation', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);
      const userCancelError = new Error('User cancelled');
      defaultProps.onConfirmation.mockRejectedValueOnce(userCancelError);
      mockIsUserCancellation.mockReturnValue(true);

      render(<LedgerConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onRejection).toHaveBeenCalled();
      });

      // Should not track HARDWARE_WALLET_ERROR for user cancellation
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_ERROR,
      );
    });
  });

  describe('double execution prevention', () => {
    it('only runs the signing flow once', async () => {
      mockEnsureDeviceReady.mockResolvedValue(true);

      const { rerender } = render(
        <LedgerConfirmationModal {...defaultProps} />,
      );

      await waitFor(() => {
        expect(mockEnsureDeviceReady).toHaveBeenCalledTimes(1);
      });

      // Trigger a rerender
      rerender(<LedgerConfirmationModal {...defaultProps} />);

      // Should still only have been called once
      expect(mockEnsureDeviceReady).toHaveBeenCalledTimes(1);
    });
  });
});
