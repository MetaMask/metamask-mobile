import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
} from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import AddDeviceToWallet from './index';
import { AddDeviceToWalletTestIds } from './AddDeviceToWallet.testIds';
import { AccountsImportedTestIds } from './AccountsImported.testIds';
import { clearQrSyncAccountsReview } from '../../../core/QrSync/qrSyncAccountsReview';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
  useTheme: () => 'light',
  Theme: { Light: 'light', Dark: 'dark' },
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncProvisioningService: {
      provisionFromMetadata: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockIsQrTabSwitcherOpen = false;

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

jest.mock('../../../core/QrSync/useIsQrTabSwitcherOpen', () => ({
  useIsQrTabSwitcherOpen: () => mockIsQrTabSwitcherOpen,
}));

jest.mock('../QRTabSwitcher', () => ({
  QRTabSwitcherScreens: { Scanner: 'Scanner' },
}));

import { createMockRouteMessenger } from '../../../util/test/mock-route-messenger';

const mockHandleScannedQrPayload = jest.fn();
const mockResetState = jest.fn();
const mockHasPendingSecretImports = jest.fn().mockResolvedValue(false);

const renderComponent = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState> = {},
  completedOnboarding = false,
) =>
  renderWithProvider(<AddDeviceToWallet />, {
    routeMessenger: createMockRouteMessenger({
      'QrSyncController:resetState': mockResetState,
      'QrSyncController:handleScannedQrPayload': mockHandleScannedQrPayload,
      'QrSyncController:importRemainingSecrets': jest.fn(),
      'QrSyncController:hasPendingSecretImports': mockHasPendingSecretImports,
      'KeyringController:getAccounts': jest.fn().mockResolvedValue([]),
    }),
    state: {
      engine: {
        backgroundState: {
          QrSyncController: {
            ...defaultQrSyncControllerState,
            ...qrSyncState,
          },
        },
      },
      onboarding: {
        completedOnboarding,
      },
    },
  });

describe('AddDeviceToWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsQrTabSwitcherOpen = false;
    clearQrSyncAccountsReview();
    mockHasPendingSecretImports.mockResolvedValue(false);
  });

  describe('initial render', () => {
    it('renders the back button', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId('button-icon')).toBeOnTheScreen();
    });

    it('renders the page heading', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.add_device_to_wallet')),
      ).toBeOnTheScreen();
    });

    it('exposes screen and primary action testIDs', () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId(AddDeviceToWalletTestIds.SCREEN)).toBeOnTheScreen();
      expect(
        getByTestId(AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the scan QR code button', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      ).toBeOnTheScreen();
    });

    it('renders the instruction titles and descriptions', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.points.one_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.one_description')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.two_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('app_settings.add_device.points.two_description_prefix'),
          {
            exact: false,
          },
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('app_settings.add_device.points.two_description_path'),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.three_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.three_description')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.four_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.points.four_description')),
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
    it('calls navigation.goBack when back button is pressed', async () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('button-icon'));

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('resets QR sync state when back is pressed during an active session', async () => {
      const { getByTestId } = renderComponent({
        phase: QrSyncPhases.DISPLAYING_OTP,
      });

      fireEvent.press(getByTestId('button-icon'));

      await waitFor(() => {
        expect(mockResetState).toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      });
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

    it('resets a stale QR sync session before opening the scanner', async () => {
      mockIsQrTabSwitcherOpen = true;

      const { getByText } = renderComponent({
        phase: QrSyncPhases.AWAITING_SYNC_READY,
      });

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      await waitFor(() => {
        expect(mockResetState).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('navigates to the QR scanner with Scanner screen and tabber disabled', () => {
      const { getByText } = renderComponent();

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.QR_TAB_SWITCHER,
        expect.objectContaining({
          initialScreen: 'Scanner',
          disableTabber: true,
          origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
        }),
      );
      expect(mockNavigate.mock.calls[0][1].onScanSuccess).toBeUndefined();
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
          Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
        );
      });
    });

    it('does not open the verification sheet while the scanner is open', async () => {
      mockIsQrTabSwitcherOpen = true;

      renderComponent({
        phase: QrSyncPhases.DISPLAYING_OTP,
        otp: { otp: '123456', deadline: Date.now() + 30_000 },
      });

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
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

    it('does not show sync error message on the instructions screen', () => {
      const { queryByText, getByText } = renderComponent({
        phase: QrSyncPhases.FAILED,
        error: {
          code: 'SYNC_FAILED',
          message: 'Sync failed',
        },
      });

      expect(
        getByText(strings('app_settings.add_device.add_device_to_wallet')),
      ).toBeOnTheScreen();
      expect(queryByText('Sync failed')).toBeNull();
    });
  });

  describe('QR sync import navigation', () => {
    const pendingSecretImports = {
      version: 1 as const,
      wallets: [
        {
          id: 'wallet:test' as `wallet:${string}`,
          type: 'mnemonic' as const,
          value: [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6],
          metadata: { name: 'Wallet 1' },
          groups: [
            {
              id: 'wallet:test/0' as `wallet:${string}/${string}`,
              groupIndex: 0,
              metadata: { name: 'Account 1', pinned: false, hidden: false },
            },
          ],
        },
      ],
    };

    it('shows imported accounts and continues to create a password', async () => {
      const { findByText, getByTestId } = renderComponent({
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
        pendingSecretImports,
      });

      expect(
        await findByText(
          strings('app_settings.add_device.accounts_imported_title_one', {
            accountCount: 1,
          }),
        ),
      ).toBeOnTheScreen();
      expect(await findByText('Account 1')).toBeOnTheScreen();
      expect(await findByText('Wallet 1')).toBeOnTheScreen();

      fireEvent.press(getByTestId(AccountsImportedTestIds.CONTINUE));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        {
          initialStep: 1,
          qrSyncImport: true,
        },
      );
    });

    it('returns to add-device instructions from the imported accounts screen', async () => {
      const { findByTestId, getByText, queryByText } = renderComponent({
        phase: QrSyncPhases.COMPLETED,
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
        pendingSecretImports,
      });

      fireEvent.press(await findByTestId(AccountsImportedTestIds.BACK));

      expect(mockResetState).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(
        getByText(strings('app_settings.add_device.add_device_to_wallet')),
      ).toBeOnTheScreen();
      expect(
        queryByText(strings('app_settings.add_device.waiting_for_extension')),
      ).not.toBeOnTheScreen();
    });

    it('shows imported accounts after an existing-user import and goes home on Done', async () => {
      mockHasPendingSecretImports.mockResolvedValue(true);

      const { findByText, getByTestId } = renderComponent(
        {
          provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
          pendingSecretImports,
        },
        true,
      );

      expect(
        await findByText(strings('app_settings.add_device.done')),
      ).toBeOnTheScreen();
      expect(await findByText('Account 1')).toBeOnTheScreen();
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.WALLET_VIEW);

      fireEvent.press(getByTestId(AccountsImportedTestIds.CONTINUE));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
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
      });
    });
  });
});
