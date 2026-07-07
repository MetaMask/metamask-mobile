import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
} from '../../../core/QrSync/constants';
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

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      cancelSession: jest.fn(),
      handleScannedQrPayload: jest.fn(),
    },
  },
}));

import Engine from '../../../core/Engine';

const mockCancelSession = Engine.context.QrSyncController
  .cancelSession as jest.Mock;

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
        queryByText(strings('app_settings.add_device.waiting_for_extension')),
      ).not.toBeOnTheScreen();
    });

    it('does not navigate to import on initial load', () => {
      renderComponent();

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        expect.anything(),
      );
    });
  });

  describe('back navigation', () => {
    it('calls navigation.goBack when back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('button-icon'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('cancels the QR sync session when back is pressed during an active session', () => {
      const { getByTestId } = renderComponent({
        phase: QrSyncPhases.DISPLAYING_OTP,
      });

      fireEvent.press(getByTestId('button-icon'));

      expect(mockCancelSession).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
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
      const { getByText, getByTestId } = renderComponent({
        phase: QrSyncPhases.AWAITING_SYNC_READY,
      });

      expect(getByTestId('device-added-loader')).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.waiting_for_extension')),
      ).toBeOnTheScreen();
    });

    it('does not render the manual QR input outside dev', () => {
      const globalWithDev = global as unknown as { __DEV__: boolean };
      const originalDev = globalWithDev.__DEV__;
      globalWithDev.__DEV__ = false;

      try {
        const { queryByText } = renderComponent();

        expect(queryByText('Enter QR data manually')).not.toBeOnTheScreen();
      } finally {
        globalWithDev.__DEV__ = originalDev;
      }
    });

    it('shows sync error message when the session fails in dev', () => {
      const globalWithDev = global as unknown as { __DEV__: boolean };
      const originalDev = globalWithDev.__DEV__;
      globalWithDev.__DEV__ = true;

      try {
        const { getByText } = renderComponent({
          phase: QrSyncPhases.FAILED,
          error: {
            code: 'SYNC_FAILED',
            message: 'Sync failed',
          },
        });

        expect(getByText('Sync failed')).toBeOnTheScreen();
      } finally {
        globalWithDev.__DEV__ = originalDev;
      }
    });
  });

  describe('QR sync import navigation', () => {
    const pendingSecretImports = [
      {
        index: 0,
        value: 'word1 word2 word3',
        type: QrSyncSecretTypes.MNEMONIC,
        isPrimary: true,
      },
    ];

    it('navigates to import when awaiting password with pending secrets', async () => {
      renderComponent({
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
        pendingSecretImports,
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
          {
            initialStep: 1,
            qrSyncImport: true,
          },
        );
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
          {
            initialStep: 1,
            qrSyncImport: true,
          },
        );
      });
    });

    it('navigates to import after sync completes while secrets are still pending', async () => {
      renderComponent({
        phase: QrSyncPhases.COMPLETED,
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
        pendingSecretImports,
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

    it('does not navigate to import when sync failed with stale secret data', async () => {
      renderComponent({
        phase: QrSyncPhases.FAILED,
        pendingSecretImports,
        error: {
          code: 'SYNC_FAILED',
          message: 'Sync failed',
        },
      });

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
          expect.anything(),
        );
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
          expect.anything(),
        );
      });
    });
  });
});
