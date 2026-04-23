import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ReactTestInstance } from 'react-test-renderer';
import { View, Button, Text } from 'react-native';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';

import {
  AwaitingConfirmationContent,
  AWAITING_CONFIRMATION_CONTENT_TEST_ID,
  AWAITING_CONFIRMATION_QR_CONTAINER_TEST_ID,
  AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID,
  AWAITING_CONFIRMATION_SPINNER_TEST_ID,
} from './AwaitingConfirmationContent';
import QRSigningContext, {
  QRSigningContextValue,
} from '../../../contexts/QRSigningContext';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn().mockReturnValue({ name: 'built-event' }),
  }),
});

jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockQrScanner = {
  resolvePendingScan: jest.fn(),
  rejectPendingScan: jest.fn(),
};

jest.mock('../../../../Engine', () => ({
  getQrKeyringScanner: jest.fn(() => mockQrScanner),
}));

jest.mock('uuid', () => ({
  stringify: jest.fn().mockReturnValue('matching-request-id'),
}));

jest.mock('../../../../../components/UI/QRHardware/AnimatedQRCode', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return () => <MockView testID="animated-qr-code" />;
});

const MockView = View;
const MockButton = Button;

jest.mock('../../../../../components/UI/QRHardware/AnimatedQRScanner', () => ({
  __esModule: true,
  default: ({
    hideModal,
    onScanError,
    onScanSuccess,
    visible,
  }: {
    hideModal: () => void;
    onScanError: (error: string) => void;
    onScanSuccess: (ur: { cbor: string; type: string }) => void;
    visible: boolean;
  }) => {
    if (!visible) return null;
    return (
      <MockView testID="animated-qr-scanner-mock">
        <MockButton
          testID="scanner-hide-btn"
          title="hideModal"
          onPress={hideModal}
        />
        <MockButton
          testID="scanner-error-btn"
          title="onScanError"
          onPress={() => onScanError('scan failed')}
        />
        <MockButton
          testID="scanner-success-btn"
          title="onScanSuccess"
          onPress={() =>
            onScanSuccess({
              cbor: 'a501d82550matchingrequestid',
              type: 'eth-signature',
            })
          }
        />
      </MockView>
    );
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  },
}));

jest.mock('@keystonehq/bc-ur-registry-eth', () => ({
  ETHSignature: {
    fromCBOR: jest.fn().mockReturnValue({
      getRequestId: jest.fn().mockReturnValue({
        // Buffer-like object that uuid.stringify can consume
        toString: jest.fn().mockReturnValue('hex'),
        length: 16,
      }),
    }),
  },
}));

describe('AwaitingConfirmationContent', () => {
  const mockInitialState = {
    user: {
      appTheme: AppThemeKey.light,
    },
    settings: {
      useBlockieIcon: false,
    },
    engine: {
      backgroundState: {
        PreferencesController: {},
      },
    },
  };

  const defaultProps = {
    deviceType: HardwareWalletType.Ledger,
  };

  const defaultQRSigningContext: QRSigningContextValue = {
    pendingScanRequest: undefined,
    isSigningQRObject: false,
    setRequestCompleted: jest.fn(),
    isRequestCompleted: false,
    cancelQRScanRequestIfPresent: jest.fn().mockResolvedValue(undefined),
  };

  const renderComponent = (
    props = {},
    qrSigningOverrides?: Partial<QRSigningContextValue>,
  ) =>
    renderWithProvider(
      <QRSigningContext.Provider
        value={{ ...defaultQRSigningContext, ...qrSigningOverrides }}
      >
        <AwaitingConfirmationContent {...defaultProps} {...props} />
      </QRSigningContext.Provider>,
      { state: mockInitialState },
      false,
      false,
    );

  const qrSigningOverrides = {
    isSigningQRObject: true,
    pendingScanRequest: {
      type: QrScanRequestType.SIGN,
      request: {
        requestId: 'matching-request-id',
        payload: { cbor: 'abcd', type: 'eth-sign-request' },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('non-QR flow (Ledger/Lattice)', () => {
    it('renders with test ID', () => {
      const { getByTestId } = renderComponent();

      expect(
        getByTestId(AWAITING_CONFIRMATION_CONTENT_TEST_ID),
      ).toBeOnTheScreen();
    });

    it('renders activity indicator', () => {
      const { getByTestId } = renderComponent();

      expect(
        getByTestId(AWAITING_CONFIRMATION_SPINNER_TEST_ID),
      ).toBeOnTheScreen();
    });

    it('renders review message', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(/hardware_wallet\.awaiting_confirmation\.message/),
      ).toBeOnTheScreen();
    });

    it('shows transaction title by default', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(/hardware_wallet\.awaiting_confirmation\.title_transaction/),
      ).toBeOnTheScreen();
    });

    it('shows transaction title when operationType is transaction', () => {
      const { getByText } = renderComponent({
        operationType: 'transaction',
      });

      expect(
        getByText(/hardware_wallet\.awaiting_confirmation\.title_transaction/),
      ).toBeOnTheScreen();
    });

    it('shows message title for message operation', () => {
      const { getByText } = renderComponent({ operationType: 'message' });

      expect(
        getByText(/hardware_wallet\.awaiting_confirmation\.title_message/),
      ).toBeOnTheScreen();
    });

    it('renders cancel button when onCancel provided', () => {
      const onCancel = jest.fn();
      const { getByText } = renderComponent({ onCancel });

      const cancelButton = getByText('hardware_wallet.common.cancel');
      fireEvent.press(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    });

    it('does not render cancel button when onCancel not provided', () => {
      const { queryByText } = renderComponent();

      expect(queryByText('hardware_wallet.common.cancel')).toBeNull();
    });
  });

  describe('QR flow', () => {
    it('renders QR code and get signature button for QR signing flow', () => {
      const { getByTestId } = renderComponent(
        { deviceType: HardwareWalletType.Qr },
        qrSigningOverrides,
      );

      expect(
        getByTestId(AWAITING_CONFIRMATION_QR_CONTAINER_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        getByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
      ).toBeOnTheScreen();
    });

    it('opens scanner when tapping get signature in QR flow', () => {
      const { getByTestId } = renderComponent(
        { deviceType: HardwareWalletType.Qr },
        qrSigningOverrides,
      );

      fireEvent.press(
        getByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
      );

      expect(getByTestId('animated-qr-scanner-mock')).toBeOnTheScreen();
    });

    it('renders spinner in QR flow when not signing QR object', () => {
      const { getByTestId, queryByTestId } = renderComponent(
        { deviceType: HardwareWalletType.Qr },
        { isSigningQRObject: false },
      );

      expect(
        getByTestId(AWAITING_CONFIRMATION_SPINNER_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(AWAITING_CONFIRMATION_QR_CONTAINER_TEST_ID),
      ).toBeNull();
    });

    it('rejects pending QR scan then calls onCancel when cancel is pressed in QR flow', async () => {
      const onCancel = jest.fn();
      const cancelQRScanRequestIfPresent = jest
        .fn()
        .mockResolvedValue(undefined);
      const { getAllByText } = renderComponent(
        { deviceType: HardwareWalletType.Qr, onCancel },
        { ...qrSigningOverrides, cancelQRScanRequestIfPresent },
      );

      const cancelButtons = getAllByText('hardware_wallet.common.cancel');
      fireEvent.press(cancelButtons[0]);

      await waitFor(() => {
        expect(cancelQRScanRequestIfPresent).toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalled();
      });
    });

    it('closes scanner via QR cancel callback', () => {
      const onCancel = jest.fn();
      const { getByTestId, queryByTestId } = renderComponent(
        { deviceType: HardwareWalletType.Qr, onCancel },
        qrSigningOverrides,
      );

      fireEvent.press(
        getByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
      );

      fireEvent.press(getByTestId('scanner-hide-btn'));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('scanner callbacks', () => {
    const renderWithScanner = (overrides = {}) =>
      renderComponent(
        { deviceType: HardwareWalletType.Qr, ...overrides },
        qrSigningOverrides,
      );

    const openScanner = (getByTestId: (id: string) => ReactTestInstance) => {
      fireEvent.press(
        getByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
      );
    };

    it('calls resolvePendingScan on successful scan with matching requestId', () => {
      const setRequestCompleted = jest.fn();
      const { getByTestId } = renderWithScanner({ setRequestCompleted });

      openScanner(getByTestId);
      fireEvent.press(getByTestId('scanner-success-btn'));

      expect(mockQrScanner.resolvePendingScan).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'eth-signature',
        }),
      );
    });

    it('tracks error event on mismatched requestId', () => {
      const { stringify } = jest.requireMock('uuid');
      stringify.mockReturnValueOnce('different-request-id');

      const { getByTestId } = renderWithScanner();

      openScanner(getByTestId);
      fireEvent.press(getByTestId('scanner-success-btn'));

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalled();
    });

    it('shows error message on scan error', () => {
      const { getByTestId, getByText } = renderWithScanner();

      openScanner(getByTestId);
      fireEvent.press(getByTestId('scanner-error-btn'));

      expect(getByText('scan failed')).toBeOnTheScreen();
    });

    it('dismisses error message when alert is pressed', () => {
      const { stringify } = jest.requireMock('uuid');
      stringify.mockReturnValueOnce('different-request-id');

      const { getByTestId, queryByText, getByText } = renderWithScanner();

      openScanner(getByTestId);
      fireEvent.press(getByTestId('scanner-success-btn'));

      expect(
        getByText('transaction.mismatched_qr_request_id'),
      ).toBeOnTheScreen();

      fireEvent.press(getByText('transaction.mismatched_qr_request_id'));

      expect(queryByText('transaction.mismatched_qr_request_id')).toBeNull();
    });

    it('clears error when scanner becomes visible again', () => {
      const { stringify } = jest.requireMock('uuid');
      stringify.mockReturnValueOnce('different-request-id');

      const { getByTestId, queryByText, getByText } = renderWithScanner();

      openScanner(getByTestId);
      fireEvent.press(getByTestId('scanner-success-btn'));

      expect(
        getByText('transaction.mismatched_qr_request_id'),
      ).toBeOnTheScreen();

      // Re-open the scanner - this triggers useEffect that clears errorMessage
      fireEvent.press(
        getByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
      );

      expect(queryByText('transaction.mismatched_qr_request_id')).toBeNull();
    });
  });

  describe('state reset', () => {
    it('does not show scanner when isSigningQRObject is false', () => {
      const { queryByTestId } = renderComponent(
        { deviceType: HardwareWalletType.Qr },
        { isSigningQRObject: false },
      );

      expect(queryByTestId('animated-qr-scanner-mock')).toBeNull();
    });

    it('does not show get sign button when isSigningQRObject is false', () => {
      const { queryByTestId } = renderComponent(
        { deviceType: HardwareWalletType.Qr },
        { isSigningQRObject: false },
      );

      expect(
        queryByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
      ).toBeNull();
    });
  });
});
