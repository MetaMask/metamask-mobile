import React from 'react';
import { waitFor, act } from '@testing-library/react-native';
import {
  useCameraPermission,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { Linking } from 'react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { QRType, QRScannerEventProperties, ScanResult } from './constants';
import Routes from '../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn();
const mockLinkingOpenURL = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: jest.fn(),
  useCameraPermission: jest.fn(),
  useCodeScanner: jest.fn(),
}));

jest.mock('../../../components/hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
    },
  },
}));

jest.mock('../../../core/SDKConnectV2', () => ({
  __esModule: true,
  default: {
    isConnectDeeplink: jest.fn().mockReturnValue(false),
    handleConnectDeeplink: jest.fn(),
  },
}));

jest.mock('../../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  __esModule: true,
  default: {
    parse: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../../../util/validators', () => ({
  isValidMnemonic: jest.fn().mockReturnValue(false),
  failedSeedPhraseRequirements: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../util/address', () => ({
  isValidAddressInputViaQRCode: jest.fn().mockReturnValue(true),
}));

jest.mock('ethereumjs-util', () => ({
  isValidAddress: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../util/general', () => ({
  getURLProtocol: jest.fn().mockReturnValue(''),
}));

jest.mock('eth-url-parser', () => ({
  parse: jest.fn().mockReturnValue({
    target_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chain_id: '1',
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(null),
}));

const mockUseCameraDevice = useCameraDevice as jest.MockedFunction<
  typeof useCameraDevice
>;
const mockUseCameraPermission = useCameraPermission as jest.MockedFunction<
  typeof useCameraPermission
>;
const mockUseCodeScanner = useCodeScanner as jest.MockedFunction<
  typeof useCodeScanner
>;

const initialState = {
  engine: {
    backgroundState,
  },
};

// Import useMetrics after mocking
import useMetrics from '../../../components/hooks/useMetrics/useMetrics';

const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

describe('QrScanner', () => {
  let onCodeScannedCallback: ((codes: { value: string }[]) => void) | null =
    null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockLinkingOpenURL.mockClear();

    // Setup Linking mock
    (Linking.openURL as jest.Mock) = mockLinkingOpenURL.mockResolvedValue(true);

    // Setup metrics mocks
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    // createEventBuilder can be called with or without addProperties
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      isEnabled: jest.fn().mockReturnValue(true),
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getMetaMetricsId: jest.fn(),
      isDataRecorded: jest.fn().mockReturnValue(true),
      getDeleteRegulationId: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
    } as ReturnType<typeof useMetrics>);

    // Setup camera mocks
    mockUseCameraDevice.mockReturnValue({
      id: 'back',
      position: 'back',
      name: 'Back Camera',
      hasFlash: false,
    } as unknown as ReturnType<typeof useCameraDevice>);
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn().mockResolvedValue('granted'),
    });

    // Setup code scanner mock to capture callback
    mockUseCodeScanner.mockImplementation((config) => {
      if (config?.onCodeScanned) {
        onCodeScannedCallback = config.onCodeScanned as (
          codes: { value: string }[],
        ) => void;
      }
      return {
        codeTypes: ['qr'],
        onCodeScanned: config?.onCodeScanned || jest.fn(),
      };
    });

    onCodeScannedCallback = null;

    mockNavigate.mockImplementation(() => undefined);
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <QrScanner onScanSuccess={jest.fn()} />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should request permission when hasPermission is false', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue('granted');
    mockUseCameraPermission.mockReturnValue({
      hasPermission: false,
      requestPermission: mockRequestPermission,
    });

    renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });
  });

  it('should not request permission when hasPermission is true', async () => {
    const mockRequestPermission = jest.fn();
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: mockRequestPermission,
    });

    renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
      state: initialState,
    });

    await waitFor(() => {
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });
  });

  it('should call onScanError when camera error occurs', () => {
    const mockOnScanError = jest.fn();
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    renderWithProvider(
      <QrScanner onScanSuccess={jest.fn()} onScanError={mockOnScanError} />,
      { state: initialState },
    );

    expect(mockOnScanError).toBeDefined();
  });

  it('should render camera not available message when no camera device', () => {
    mockUseCameraDevice.mockReturnValue(undefined);
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <QrScanner onScanSuccess={jest.fn()} />,
      { state: initialState },
    );

    expect(getByText('Camera not available')).toBeOnTheScreen();
  });

  describe('QR Scanner Metrics', () => {
    describe('QR_SCANNER_OPENED event', () => {
      it('tracks QR_SCANNER_OPENED when permission granted and camera available', async () => {
        mockUseCameraPermission.mockReturnValue({
          hasPermission: true,
          requestPermission: jest.fn().mockResolvedValue('granted'),
        });

        renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(mockCreateEventBuilder).toHaveBeenCalledWith(
            MetaMetricsEvents.QR_SCANNER_OPENED,
          );
          expect(mockTrackEvent).toHaveBeenCalled();
        });
      });

      it('does not track QR_SCANNER_OPENED when permission is not granted', async () => {
        mockUseCameraPermission.mockReturnValue({
          hasPermission: false,
          requestPermission: jest.fn().mockResolvedValue('denied'),
        });

        renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
            MetaMetricsEvents.QR_SCANNER_OPENED,
          );
        });
      });

      it('does not track QR_SCANNER_OPENED when camera device is not available', () => {
        mockUseCameraDevice.mockReturnValue(undefined);
        mockUseCameraPermission.mockReturnValue({
          hasPermission: true,
          requestPermission: jest.fn(),
        });

        renderWithProvider(<QrScanner onScanSuccess={jest.fn()} />, {
          state: initialState,
        });

        expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
          MetaMetricsEvents.QR_SCANNER_OPENED,
        );
      });
    });

    describe('QR_SCANNED event', () => {
      beforeEach(() => {
        mockUseCameraPermission.mockReturnValue({
          hasPermission: true,
          requestPermission: jest.fn().mockResolvedValue('granted'),
        });

        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const generalUtilsModule = jest.requireMock('../../../util/general');
        (generalUtilsModule.getURLProtocol as jest.Mock).mockImplementation(
          () => '',
        );
      });

      it('tracks QR_SCANNED with seed phrase type when scanning seed phrase', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(true);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(false);

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([
            {
              value:
                'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
            },
          ]);
        });

        await waitFor(() => {
          expect(mockCreateEventBuilder).toHaveBeenCalledWith(
            MetaMetricsEvents.QR_SCANNED,
          );
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: true,
            [QRScannerEventProperties.QR_TYPE]: QRType.SEED_PHRASE,
            [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
          });
        });
      });

      it('tracks QR_SCANNED with private key type when scanning private key', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const ethereumjsUtilModule = jest.requireMock('ethereumjs-util');
        (ethereumjsUtilModule.isValidAddress as jest.Mock).mockReturnValue(
          false,
        );

        const generalUtilsModule = jest.requireMock('../../../util/general');
        (generalUtilsModule.getURLProtocol as jest.Mock).mockReturnValue('');

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          // 66 character string: '0x' + 64 hex chars
          onCodeScannedCallback?.([{ value: '0x' + 'a'.repeat(64) }]);
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: true,
            [QRScannerEventProperties.QR_TYPE]: QRType.PRIVATE_KEY,
            [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
          });
        });
      });

      it('tracks QR_SCANNED with send flow type when scanning ethereum address', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const generalUtilsModule = jest.requireMock('../../../util/general');
        (generalUtilsModule.getURLProtocol as jest.Mock).mockReturnValue('');

        const ethereumjsUtilModule = jest.requireMock('ethereumjs-util');
        (ethereumjsUtilModule.isValidAddress as jest.Mock).mockReturnValue(
          true,
        );

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([
            { value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
          ]);
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith(
            expect.objectContaining({
              [QRScannerEventProperties.SCAN_SUCCESS]: true,
              [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
              [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
            }),
          );
        });
      });

      it('tracks QR_SCANNED with send flow type and scan_success false for invalid address in send flow', async () => {
        const addressUtilsModule = jest.requireMock('../../../util/address');
        (
          addressUtilsModule.isValidAddressInputViaQRCode as jest.Mock
        ).mockReturnValue(false);

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(
          <QrScanner
            onScanSuccess={mockOnScanSuccess}
            origin={Routes.SEND_FLOW.SEND_TO}
          />,
          { state: initialState },
        );

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([{ value: 'invalid-address' }]);
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: false,
            [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
            [QRScannerEventProperties.SCAN_RESULT]:
              ScanResult.INVALID_ADDRESS_FORMAT,
          });
        });
      });

      it('tracks QR_SCANNED with wallet connect type when scanning wallet connect URI', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([
            {
              value: 'wc:1234567890@1?bridge=https://bridge.walletconnect.org',
            },
          ]);
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: true,
            [QRScannerEventProperties.QR_TYPE]: QRType.WALLET_CONNECT,
            [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
          });
        });
      });

      it('tracks QR_SCANNED with deeplink type when scanning SDK deeplink', async () => {
        const SDKConnectV2Module = jest.requireMock(
          '../../../core/SDKConnectV2',
        );
        (
          SDKConnectV2Module.default.isConnectDeeplink as jest.Mock
        ).mockReturnValue(true);

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([{ value: 'metamask-sdk://connect' }]);
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: true,
            [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
            [QRScannerEventProperties.SCAN_RESULT]: ScanResult.DEEPLINK_HANDLED,
          });
        });
      });

      it('tracks QR_SCANNED with url type when scanning URL and user confirms', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const ethereumjsUtilModule = jest.requireMock('ethereumjs-util');
        (ethereumjsUtilModule.isValidAddress as jest.Mock).mockReturnValue(
          false,
        );

        const generalUtilsModule = jest.requireMock('../../../util/general');
        (generalUtilsModule.getURLProtocol as jest.Mock).mockReturnValue(
          'https',
        );

        const SDKConnectV2Module = jest.requireMock(
          '../../../core/SDKConnectV2',
        );
        (
          SDKConnectV2Module.default.isConnectDeeplink as jest.Mock
        ).mockReturnValue(false);

        const SharedDeeplinkManagerModule = jest.requireMock(
          '../../../core/DeeplinkManager/SharedDeeplinkManager',
        );
        (
          SharedDeeplinkManagerModule.default.parse as jest.Mock
        ).mockResolvedValue(false);

        let confirmCallback: (() => void) | undefined;
        mockNavigate.mockImplementation((_route, params) => {
          confirmCallback = params?.params?.onConfirm;
        });

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([{ value: 'https://example.com' }]);
        });

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalled();
        });

        await act(async () => {
          confirmCallback?.();
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: true,
            [QRScannerEventProperties.QR_TYPE]: QRType.URL,
            [QRScannerEventProperties.SCAN_RESULT]:
              ScanResult.URL_NAVIGATION_CONFIRMED,
          });
          expect(mockLinkingOpenURL).toHaveBeenCalledWith(
            'https://example.com',
          );
          expect(mockGoBack).toHaveBeenCalled();
        });
      });

      it('tracks QR_SCANNED with url type and scan_success false when user cancels URL redirection', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const ethereumjsUtilModule = jest.requireMock('ethereumjs-util');
        (ethereumjsUtilModule.isValidAddress as jest.Mock).mockReturnValue(
          false,
        );

        const generalUtilsModule = jest.requireMock('../../../util/general');
        (generalUtilsModule.getURLProtocol as jest.Mock).mockReturnValue(
          'https',
        );

        const SDKConnectV2Module = jest.requireMock(
          '../../../core/SDKConnectV2',
        );
        (
          SDKConnectV2Module.default.isConnectDeeplink as jest.Mock
        ).mockReturnValue(false);

        const SharedDeeplinkManagerModule = jest.requireMock(
          '../../../core/DeeplinkManager/SharedDeeplinkManager',
        );
        (
          SharedDeeplinkManagerModule.default.parse as jest.Mock
        ).mockResolvedValue(false);

        let cancelCallback: (() => void) | undefined;
        mockNavigate.mockImplementation((_route, params) => {
          cancelCallback = params?.params?.onCancel;
        });

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          onCodeScannedCallback?.([{ value: 'https://example.com' }]);
        });

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalled();
        });

        await act(async () => {
          cancelCallback?.();
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: false,
            [QRScannerEventProperties.QR_TYPE]: QRType.URL,
            [QRScannerEventProperties.SCAN_RESULT]:
              ScanResult.URL_NAVIGATION_CANCELLED,
          });
        });
      });

      it('tracks QR_SCANNED with unrecognized_qr_code result and scan_success false for arbitrary content', async () => {
        const validatorsModule = jest.requireMock('../../../util/validators');
        (validatorsModule.isValidMnemonic as jest.Mock).mockReturnValue(false);
        (
          validatorsModule.failedSeedPhraseRequirements as jest.Mock
        ).mockReturnValue(true);

        const ethereumjsUtilModule = jest.requireMock('ethereumjs-util');
        (ethereumjsUtilModule.isValidAddress as jest.Mock).mockReturnValue(
          false,
        );

        const generalUtilsModule = jest.requireMock('../../../util/general');
        (generalUtilsModule.getURLProtocol as jest.Mock).mockReturnValue('');

        const SDKConnectV2Module = jest.requireMock(
          '../../../core/SDKConnectV2',
        );
        (
          SDKConnectV2Module.default.isConnectDeeplink as jest.Mock
        ).mockReturnValue(false);

        const SharedDeeplinkManagerModule = jest.requireMock(
          '../../../core/DeeplinkManager/SharedDeeplinkManager',
        );
        (
          SharedDeeplinkManagerModule.default.parse as jest.Mock
        ).mockResolvedValue(false);

        const mockOnScanSuccess = jest.fn();
        renderWithProvider(<QrScanner onScanSuccess={mockOnScanSuccess} />, {
          state: initialState,
        });

        await waitFor(() => {
          expect(onCodeScannedCallback).toBeDefined();
        });

        await act(async () => {
          // Arbitrary content that doesn't match any known pattern
          onCodeScannedCallback?.([{ value: 'arbitrary-unknown-content-123' }]);
        });

        await waitFor(() => {
          expect(mockAddProperties).toHaveBeenCalledWith({
            [QRScannerEventProperties.SCAN_SUCCESS]: false,
            [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK, // getQRType returns DEEPLINK as default
            [QRScannerEventProperties.SCAN_RESULT]:
              ScanResult.UNRECOGNIZED_QR_CODE,
          });
          expect(mockOnScanSuccess).toHaveBeenCalledWith(
            'arbitrary-unknown-content-123',
            'arbitrary-unknown-content-123',
          );
        });
      });
    });
  });
});
