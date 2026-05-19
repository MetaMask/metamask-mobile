import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({ build: jest.fn() }),
    }),
  })),
}));

jest.mock('../../../../core/QrKeyring/QrKeyring', () => ({
  withQrKeyring: jest.fn(async (callback) =>
    callback({
      keyring: { getName: jest.fn().mockResolvedValue('MockDevice') },
      metadata: { id: 'mock-id' },
    }),
  ),
}));

jest.mock('@keystonehq/ur-decoder', () => ({
  URRegistryDecoder: jest.fn().mockImplementation(() => ({
    receivePart: jest.fn(),
    getProgress: jest.fn(() => 1),
    isError: jest.fn(() => false),
    isSuccess: jest.fn(() => true),
    resultError: jest.fn(),
    resultUR: jest.fn(() => ({
      type: 'eth-signature',
      cbor: Buffer.from([]),
    })),
  })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}:${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

jest.mock('react-native-vision-camera');

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();
const mockResolvePendingScan = jest.fn();
const mockRejectPendingScan = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  })),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../../core/Engine', () => ({
  getQrKeyringScanner: jest.fn(() => ({
    resolvePendingScan: mockResolvePendingScan,
    rejectPendingScan: mockRejectPendingScan,
  })),
}));

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: jest.fn(() => ({
    walletType: 'qr',
    qr: {
      pendingScanRequest: {
        type: 'sign',
        request: {
          requestId: 'test-request-id',
          payload: { type: 'eth-sign-request', cbor: 'aabbccdd' },
        },
      },
      isSigningQRObject: true,
      cancelQRScanRequestIfPresent: jest.fn(),
      setRequestCompleted: jest.fn(),
      isRequestCompleted: false,
    },
  })),
}));

jest.mock('@keystonehq/bc-ur-registry-eth', () => ({
  ETHSignature: {
    fromCBOR: jest.fn(() => ({
      getRequestId: jest.fn(() => Buffer.from('test-request-id')),
    })),
  },
}));

jest.mock('uuid', () => ({
  stringify: jest.fn(() => 'test-request-id'),
}));

import { HwQrScanner } from './HwQrScanner';
import { HwQrScannerSelectorsIDs } from './HwQrScanner.testIds';

describe('HwQrScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: { currentStep: 1, totalSteps: 2 } });
  });

  describe('step text', () => {
    it('renders step text for intermediate step', () => {
      mockUseRoute.mockReturnValue({
        params: { currentStep: 2, totalSteps: 4 },
      });

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText(
          'bridge.hardware_wallet_progress.scanner_step_text:{"current":2,"total":4}',
        ),
      ).toBeOnTheScreen();
    });

    it('renders last step text when currentStep equals totalSteps', () => {
      mockUseRoute.mockReturnValue({
        params: { currentStep: 4, totalSteps: 4 },
      });

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText('bridge.hardware_wallet_progress.scanner_last_step_text'),
      ).toBeOnTheScreen();
    });

    it('renders last step text for single step flow', () => {
      mockUseRoute.mockReturnValue({
        params: { currentStep: 1, totalSteps: 1 },
      });

      const { getByText } = render(<HwQrScanner />);

      expect(
        getByText('bridge.hardware_wallet_progress.scanner_last_step_text'),
      ).toBeOnTheScreen();
    });
  });

  describe('cancel', () => {
    it('rejects pending scan and navigates back on cancel press', () => {
      const { getByTestId } = render(<HwQrScanner />);

      fireEvent.press(getByTestId(HwQrScannerSelectorsIDs.CANCEL_BUTTON));

      expect(mockRejectPendingScan).toHaveBeenCalledTimes(1);
      expect(mockRejectPendingScan).toHaveBeenCalledWith(expect.any(Error));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('renders scanner container', () => {
    const { getByTestId } = render(<HwQrScanner />);
    expect(getByTestId(HwQrScannerSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});
