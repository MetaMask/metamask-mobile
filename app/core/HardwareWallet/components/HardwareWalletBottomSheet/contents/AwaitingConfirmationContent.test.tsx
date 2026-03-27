import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { View } from 'react-native';

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

jest.mock('../../../../../components/UI/QRHardware/AnimatedQRCode', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="animated-qr-code" />;
});

jest.mock('../../../../../components/UI/QRHardware/AnimatedQRScanner', () => {
  const { View } = jest.requireActual('react-native');
  return ({ visible }: { visible: boolean }) => (
    <View
      testID={
        visible ? 'animated-qr-scanner-visible' : 'animated-qr-scanner-hidden'
      }
    />
  );
});

// Mock locales
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
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

  it('renders QR code and get signature button for QR signing flow', () => {
    const { getByTestId } = renderComponent(
      { deviceType: HardwareWalletType.Qr },
      {
        isSigningQRObject: true,
        pendingScanRequest: {
          type: QrScanRequestType.SIGN,
          request: {
            requestId: 'request-id',
            payload: { cbor: 'abcd', type: 'eth-sign-request' },
          },
        },
      },
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
      {
        isSigningQRObject: true,
        pendingScanRequest: {
          type: QrScanRequestType.SIGN,
          request: {
            requestId: 'request-id',
            payload: { cbor: 'abcd', type: 'eth-sign-request' },
          },
        },
      },
    );

    fireEvent.press(
      getByTestId(AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID),
    );

    expect(getByTestId('animated-qr-scanner-visible')).toBeOnTheScreen();
  });
});
