import React, { type ReactNode } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { UR } from '@ngraveio/bc-ur';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import {
  type QrScanRequest,
  QrScanRequestType,
} from '@metamask/eth-qr-keyring';
import { stringify as uuidStringify } from 'uuid';

import Engine from '../../../core/Engine';
import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import QRSigningDetails from './QRSigningDetails';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import AnimatedQRCode from './AnimatedQRCode';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';

const mockRejectPendingScan = jest.fn();
const mockResolvePendingScan = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockSetQrScanRetryHandler = jest.fn();
const mockAddListener = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ event: 'hardware-wallet-error' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../core/Engine', () => ({
  getQrKeyringScanner: () => ({
    rejectPendingScan: mockRejectPendingScan,
    resolvePendingScan: mockResolvePendingScan,
  }),
}));

jest.mock('../../../core/HardwareWallet/contexts', () => ({
  useHardwareWallet: () => ({
    showHardwareWalletError: mockShowHardwareWalletError,
    setQrScanRetryHandler: mockSetQrScanRetryHandler,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: mockAddListener,
    dispatch: mockDispatch,
  }),
}));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');

  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('@keystonehq/bc-ur-registry-eth', () => ({
  ETHSignature: {
    fromCBOR: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  stringify: jest.fn(),
}));

jest.mock('../AccountInfoCard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return function MockAccountInfoCard(props: { fromAddress: string }) {
    return ReactActual.createElement(View, {
      testID: 'account-info-card',
      fromAddress: props.fromAddress,
    });
  };
});

jest.mock('./AnimatedQRCode', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return jest.fn((props: { shouldPause: boolean }) =>
    ReactActual.createElement(View, {
      testID: 'animated-qr-code',
      shouldPause: props.shouldPause,
    }),
  );
});

jest.mock('../ActionView', () => {
  const ReactActual = jest.requireActual('react');
  const { Button, View } = jest.requireActual('react-native');

  return function MockActionView({
    children,
    onCancelPress,
    onConfirmPress,
  }: {
    children?: ReactNode;
    onCancelPress: () => void;
    onConfirmPress: () => void;
  }) {
    return ReactActual.createElement(
      View,
      { testID: 'action-view' },
      children,
      ReactActual.createElement(Button, {
        title: 'confirm-qr-signing',
        onPress: onConfirmPress,
      }),
      ReactActual.createElement(Button, {
        title: 'cancel-qr-signing',
        onPress: onCancelPress,
      }),
    );
  };
});

const mockQrHardwareError = {
  message: 'Scanned QR code is not in UR format',
  metadata: {
    qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
    isUrFormat: false,
    receivedUrType: undefined,
  },
} as QRHardwareScanError;

jest.mock('./AnimatedQRScanner', () => {
  const ReactActual = jest.requireActual('react');
  const { Button, View } = jest.requireActual('react-native');

  return jest.fn(
    ({
      hideModal,
      onModalHideComplete,
      onQRHardwareScanError,
      onScanError,
      onScanSuccess,
      pauseQRCode,
      visible,
    }: {
      hideModal: () => void;
      onModalHideComplete?: () => void;
      onQRHardwareScanError?: (error: QRHardwareScanError) => void;
      onScanError: (errorMessage: string) => void;
      onScanSuccess: (ur: UR) => void;
      pauseQRCode?: (shouldPause: boolean) => void;
      visible: boolean;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'animated-qr-scanner', visible },
        ReactActual.createElement(Button, {
          title: 'scanner-hardware-error',
          onPress: () => onQRHardwareScanError?.(mockQrHardwareError),
        }),
        ReactActual.createElement(Button, {
          title: 'scanner-hidden',
          onPress: () => onModalHideComplete?.(),
        }),
        ReactActual.createElement(Button, {
          title: 'scanner-scan-error',
          onPress: () => onScanError('Scan failed'),
        }),
        ReactActual.createElement(Button, {
          title: 'scanner-success',
          onPress: () =>
            onScanSuccess({
              type: 'eth-signature',
              cbor: Buffer.from('signature-cbor'),
            } as unknown as UR),
        }),
        ReactActual.createElement(Button, {
          title: 'scanner-hide',
          onPress: hideModal,
        }),
        ReactActual.createElement(Button, {
          title: 'scanner-pause',
          onPress: () => pauseQRCode?.(true),
        }),
      ),
  );
});

describe('QRSigningDetails', () => {
  const pendingScanRequest: QrScanRequest = {
    type: QrScanRequestType.SIGN,
    request: {
      requestId: 'request-id',
      payload: {
        type: 'eth-sign-request',
        cbor: 'request-cbor',
      },
    },
  };

  const defaultProps = {
    pendingScanRequest,
    fromAddress: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(jest.fn());
    mockBuild.mockReturnValue({ event: 'hardware-wallet-error' });
  });

  it('opens the scanner when signing is confirmed', () => {
    const { getByText } = render(<QRSigningDetails {...defaultProps} />);

    fireEvent.press(getByText('confirm-qr-signing'));

    expect(AnimatedQRScannerModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        visible: true,
        purpose: QrScanRequestType.SIGN,
      }),
      undefined,
    );
    expect(AnimatedQRCode).toHaveBeenLastCalledWith(
      expect.objectContaining({
        shouldPause: true,
      }),
      undefined,
    );
  });

  it('forwards QR hardware scan errors after the scanner modal hides', () => {
    const { getByText } = render(<QRSigningDetails {...defaultProps} />);

    fireEvent.press(getByText('confirm-qr-signing'));
    fireEvent.press(getByText('scanner-hardware-error'));

    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(AnimatedQRScannerModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        visible: false,
      }),
      undefined,
    );

    fireEvent.press(getByText('scanner-hidden'));

    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Scanned QR code is not in UR format',
        metadata: expect.objectContaining({
          qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
        }),
      }),
    );
  });

  it('registers QR scan retry handler that reopens the scanner', () => {
    const { getByText } = render(<QRSigningDetails {...defaultProps} />);

    fireEvent.press(getByText('confirm-qr-signing'));
    fireEvent.press(getByText('scanner-hide'));
    const retryHandler = mockSetQrScanRetryHandler.mock.calls[0][0];

    act(() => {
      retryHandler();
    });

    expect(AnimatedQRScannerModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        visible: true,
      }),
      undefined,
    );
  });

  it('clears QR scan retry handler when unmounted', () => {
    const { unmount } = render(<QRSigningDetails {...defaultProps} />);

    unmount();

    expect(mockSetQrScanRetryHandler).toHaveBeenLastCalledWith(null);
  });

  it('rejects the pending scan request when signing is canceled', () => {
    const cancelCallback = jest.fn();
    const { getByText } = render(
      <QRSigningDetails {...defaultProps} cancelCallback={cancelCallback} />,
    );

    fireEvent.press(getByText('cancel-qr-signing'));

    expect(Engine.getQrKeyringScanner().rejectPendingScan).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Scan canceled',
      }),
    );
    expect(cancelCallback).toHaveBeenCalledTimes(1);
  });

  it('reports scanner scan errors to the failure callback', () => {
    const failureCallback = jest.fn();
    const { getByText } = render(
      <QRSigningDetails {...defaultProps} failureCallback={failureCallback} />,
    );

    fireEvent.press(getByText('scanner-scan-error'));

    expect(failureCallback).toHaveBeenCalledWith('Scan failed');
  });

  it('resolves the pending scan request for matching signature responses', () => {
    const successCallback = jest.fn();
    (ETHSignature.fromCBOR as jest.Mock).mockReturnValue({
      getRequestId: () => Buffer.from('matching-request-id'),
    });
    (uuidStringify as jest.Mock).mockReturnValue('request-id');
    const { getByText } = render(
      <QRSigningDetails {...defaultProps} successCallback={successCallback} />,
    );

    fireEvent.press(getByText('scanner-success'));

    expect(
      Engine.getQrKeyringScanner().resolvePendingScan,
    ).toHaveBeenCalledWith({
      type: 'eth-signature',
      cbor: Buffer.from('signature-cbor').toString('hex'),
    });
    expect(successCallback).toHaveBeenCalledTimes(1);
  });

  it('tracks hardware wallet errors for mismatched signature responses', () => {
    const failureCallback = jest.fn();
    (ETHSignature.fromCBOR as jest.Mock).mockReturnValue({
      getRequestId: () => Buffer.from('mismatched-request-id'),
    });
    (uuidStringify as jest.Mock).mockReturnValue('different-request-id');
    const { getByText } = render(
      <QRSigningDetails {...defaultProps} failureCallback={failureCallback} />,
    );

    fireEvent.press(getByText('scanner-success'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HARDWARE_WALLET_ERROR,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      error: 'received signature request id is not matched with origin request',
    });
    expect(failureCallback).toHaveBeenCalledWith(
      strings('transaction.mismatched_qr_request_id'),
    );
  });

  it('allows navigation removal after the scan request resolves', () => {
    (ETHSignature.fromCBOR as jest.Mock).mockReturnValue({
      getRequestId: () => Buffer.from('matching-request-id'),
    });
    (uuidStringify as jest.Mock).mockReturnValue('request-id');
    const { getByText } = render(<QRSigningDetails {...defaultProps} />);

    fireEvent.press(getByText('scanner-success'));
    const beforeRemoveCallback =
      mockAddListener.mock.calls[mockAddListener.mock.calls.length - 1][1];
    const preventDefault = jest.fn();

    beforeRemoveCallback({
      preventDefault,
      data: { action: { type: 'GO_BACK' } },
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('rejects pending scan requests before navigation removes the screen', () => {
    render(<QRSigningDetails {...defaultProps} />);
    const beforeRemoveCallback = mockAddListener.mock.calls[0][1];
    const preventDefault = jest.fn();
    const action = { type: 'GO_BACK' };

    beforeRemoveCallback({
      preventDefault,
      data: { action },
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(Engine.getQrKeyringScanner().rejectPendingScan).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Scan canceled',
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(action);
  });

  it('skips scan request rejection before navigation when no request exists', () => {
    render(
      <QRSigningDetails
        {...defaultProps}
        pendingScanRequest={null as unknown as QrScanRequest}
      />,
    );
    const beforeRemoveCallback = mockAddListener.mock.calls[0][1];
    const preventDefault = jest.fn();
    const action = { type: 'GO_BACK' };

    beforeRemoveCallback({
      preventDefault,
      data: { action },
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(
      Engine.getQrKeyringScanner().rejectPendingScan,
    ).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(action);
  });

  it('renders spacer content when hints are hidden without tightened layout', () => {
    render(<QRSigningDetails {...defaultProps} showHint={false} />);

    expect(AnimatedQRCode).toHaveBeenCalledWith(
      expect.objectContaining({
        shouldPause: false,
      }),
      undefined,
    );
  });

  it('renders compact content when hints are hidden with tightened layout', () => {
    const { queryByText } = render(
      <QRSigningDetails {...defaultProps} showHint={false} tighten />,
    );

    expect(queryByText(strings('transactions.sign_description_1'))).toBeNull();
  });
});
