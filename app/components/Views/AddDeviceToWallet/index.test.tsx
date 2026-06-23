import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import AddDeviceToWallet from './index';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
  useTheme: () => 'light',
  Theme: { Light: 'light', Dark: 'dark' },
}));

jest.mock(
  '../../../images/add_wallet_to_device.png',
  () => 'add_wallet_to_device_image',
);

const mockCancelSession = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      cancelSession: mockCancelSession,
      handleScannedQrPayload: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

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

const mockCreateQRScannerNavDetails = jest.fn(
  (_options: Record<string, unknown>) => [
    'QRTabSwitcher',
    { initialScreen: 'Scanner', disableTabber: true },
  ],
);

jest.mock('../QRTabSwitcher', () => ({
  createQRScannerNavDetails: (
    ...args: Parameters<typeof mockCreateQRScannerNavDetails>
  ) => mockCreateQRScannerNavDetails(...args),
  QRTabSwitcherScreens: { Scanner: 'Scanner' },
}));

const renderComponent = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState> = {},
) =>
  renderWithProvider(<AddDeviceToWallet />, {
    state: {
      engine: {
        backgroundState: {
          QrSyncController: {
            ...defaultQrSyncControllerState,
            ...qrSyncState,
          },
        },
      },
    },
  });

describe('AddDeviceToWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders the page heading', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.add_device_to_wallet')),
      ).toBeOnTheScreen();
    });

    it('renders the scan QR code button', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      ).toBeOnTheScreen();
    });

    it('renders instruction point 1', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.points.one')),
      ).toBeOnTheScreen();
    });

    it('renders instruction points 3 and 4', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.points.three')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.four')),
      ).toBeOnTheScreen();
    });

    it('renders point 2 bold text fragments', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.points.two_bold_one')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.two_bold_two')),
      ).toBeOnTheScreen();
    });

    it('does not render DeviceAdded screen on initial load', () => {
      const { queryByText } = renderComponent();

      expect(
        queryByText(strings('app_settings.add_device.device_added')),
      ).not.toBeOnTheScreen();
    });
  });

  describe('QR scanner', () => {
    it('opens the QR scanner when scan button is pressed', () => {
      const { getByText } = renderComponent();

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('calls createQRScannerNavDetails with Scanner screen and tabber disabled', () => {
      const { getByText } = renderComponent();

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      expect(mockCreateQRScannerNavDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          initialScreen: 'Scanner',
          disableTabber: true,
          origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
          onScanSuccess: expect.any(Function),
        }),
      );
    });
  });

  describe('QR sync presentation', () => {
    it('shows the verification sheet when OTP is available', async () => {
      renderComponent({
        phase: QrSyncPhases.DISPLAYING_OTP,
        otp: { otp: '123456', deadline: Date.now() + 30_000 },
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
          },
        );
      });
    });

    it('shows DeviceAdded while awaiting sync-ready', () => {
      const { getByText } = renderComponent({
        phase: QrSyncPhases.AWAITING_SYNC_READY,
      });

      expect(
        getByText(strings('app_settings.add_device.device_added')),
      ).toBeOnTheScreen();
    });
  });

  describe('QR sync import navigation', () => {
    it('navigates to import when sync completes with import data', async () => {
      renderComponent({
        phase: QrSyncPhases.COMPLETED,
        importPlan: [
          {
            index: 0,
            value: 'word1 word2 word3',
            type: 'MNEMONIC',
            accountName: null,
            hiddenIndexes: [],
            isPrimary: true,
          },
        ],
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
          {
            initialStep: 1,
            qrSyncImport: true,
          },
        );
      });
    });
  });
});
