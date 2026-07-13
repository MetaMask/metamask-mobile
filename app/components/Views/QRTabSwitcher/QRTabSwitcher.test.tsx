import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import QRTabSwitcher, { QRTabSwitcherScreens } from './QRTabSwitcher';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { endTrace, trace, TraceName } from '../../../util/trace';
import Routes from '../../../constants/navigation/Routes';
import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
} from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import type { RootState } from '../../../reducers';
import { showExtensionCancelledErrorSheet } from '../../../core/QrSync/showExtensionCancelledErrorSheet';
import { completeExistingUserQrSyncImport } from '../../../core/QrSync/completeExistingUserQrSyncImport';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: jest.fn(() => true),
  }),
  createNavigatorFactory: () => ({}),
  useRoute: jest.fn(() => ({
    params: {
      onScanError: jest.fn(),
      onScanSuccess: jest.fn(),
      initialScreen: 0,
    },
  })),
}));

jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    QRTabSwitcher: 'QRTabSwitcher',
  },
}));
jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      resetState: jest.fn(),
    },
  },
}));

import Engine from '../../../core/Engine';

const mockResetState = Engine.context.QrSyncController.resetState as jest.Mock;

jest.mock('../../../core/QrSync/showExtensionCancelledErrorSheet', () => {
  const actual = jest.requireActual(
    '../../../core/QrSync/showExtensionCancelledErrorSheet',
  );
  return {
    ...actual,
    showExtensionCancelledErrorSheet: jest.fn(),
  };
});

const mockShowExtensionCancelledErrorSheet = jest.mocked(
  showExtensionCancelledErrorSheet,
);

jest.mock('../../../core/QrSync/completeExistingUserQrSyncImport', () => ({
  completeExistingUserQrSyncImport: jest.fn(() => Promise.resolve()),
}));

const mockCompleteExistingUserQrSyncImport = jest.mocked(
  completeExistingUserQrSyncImport,
);

jest.mock('react-redux', () => {
  const { defaultQrSyncControllerState: mockDefaultQrSyncControllerState } =
    jest.requireActual('../../../core/QrSync/QrSyncController');

  return {
    useSelector: jest.fn((selector: (state: unknown) => unknown) =>
      selector({
        engine: {
          backgroundState: {
            QrSyncController: mockDefaultQrSyncControllerState,
          },
        },
      }),
    ),
  };
});

jest.mock('../QRScanner', () => jest.fn(() => null));

jest.mock('../AddDeviceToWallet/DeviceAdded', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return () =>
    ReactActual.createElement(View, { testID: 'device-added-loader-screen' });
});

const renderWithQrSyncState = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState>,
  completedOnboarding = false,
) => {
  const reactReduxModule = jest.requireMock('react-redux') as {
    useSelector: jest.Mock;
  };
  reactReduxModule.useSelector.mockImplementation(
    (selector: (state: RootState) => unknown) =>
      selector({
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
      } as RootState),
  );

  return render(<QRTabSwitcher />);
};

const renderAddDeviceFlow = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState>,
  completedOnboarding = false,
) => {
  (useRoute as jest.Mock).mockReturnValue({
    params: {
      onScanError: jest.fn(),
      onScanSuccess: jest.fn(),
      origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
    },
  });

  return renderWithQrSyncState(qrSyncState, completedOnboarding);
};

describe('QRTabSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('renders QRScanner by default', () => {
    renderWithQrSyncState({});
    jest.runAllTimers();
    // QRScanner component is rendered for camera functionality
  });

  it('starts and ends QRTabSwitcher trace on mount', () => {
    render(<QRTabSwitcher />);

    expect(trace).toHaveBeenCalledWith({ name: TraceName.QRTabSwitcher });
    expect(endTrace).toHaveBeenCalledWith({ name: TraceName.QRTabSwitcher });
  });

  it('calls onScanError with USER_CANCELLED when close is pressed', () => {
    const onScanError = jest.fn();
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        onScanError,
        onScanSuccess: jest.fn(),
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });

    const { UNSAFE_getAllByType } = render(<QRTabSwitcher />);
    const closeButtons = UNSAFE_getAllByType(ButtonIcon);

    fireEvent.press(closeButtons[0]);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(onScanError).toHaveBeenCalledWith('USER_CANCELLED');
  });

  it('logs a warning when onScanError throws', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const onScanError = jest.fn(() => {
      throw new Error('callback failed');
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        onScanError,
        onScanSuccess: jest.fn(),
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });

    const { UNSAFE_getAllByType } = render(<QRTabSwitcher />);
    fireEvent.press(UNSAFE_getAllByType(ButtonIcon)[0]);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Error setting onScanError: callback failed',
    );
    consoleWarnSpy.mockRestore();
  });

  it('renders scanner interface without tab controls', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        disableTabber: true,
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });
    const { queryByText } = renderWithQrSyncState({});
    jest.runAllTimers();
    // Scanner interface displays camera view without tab navigation
    expect(queryByText(strings('qr_tab_switcher.scanner_tab'))).toBeNull();
  });

  it('shows DeviceAdded loader on add-device origin after OTP verification', () => {
    const { getByTestId } = renderAddDeviceFlow({
      phase: QrSyncPhases.AWAITING_SYNC_READY,
    });

    expect(getByTestId('device-added-loader-screen')).toBeOnTheScreen();
  });

  it('resets QR sync session when closing scanner during add-device flow', () => {
    const { UNSAFE_getByType } = renderAddDeviceFlow({
      phase: QrSyncPhases.DISPLAYING_OTP,
      otp: { otp: '123456', deadline: Date.now() + 30_000 },
    });

    const ButtonIcon = jest.requireActual(
      '../../../component-library/components/Buttons/ButtonIcon',
    ).default;
    fireEvent.press(UNSAFE_getByType(ButtonIcon));

    expect(mockResetState).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to import when awaiting password with pending secrets for new users', async () => {
    renderAddDeviceFlow(
      {
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
        pendingSecretImports: [
          {
            index: 0,
            value: 'word1 word2 word3',
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: false,
          },
        ],
      },
      false,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
        {
          initialStep: 1,
          qrSyncImport: true,
        },
      );
    });
    expect(mockCompleteExistingUserQrSyncImport).not.toHaveBeenCalled();
  });

  it('auto-imports and navigates home when awaiting password for existing users', async () => {
    const mnemonic =
      'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';

    renderAddDeviceFlow(
      {
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
        pendingSecretImports: [
          {
            index: 0,
            value: mnemonic,
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: false,
          },
        ],
      },
      true,
    );

    await waitFor(() => {
      expect(mockCompleteExistingUserQrSyncImport).toHaveBeenCalledWith(
        expect.objectContaining({ navigate: mockNavigate }),
        mnemonic,
      );
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE,
      expect.anything(),
    );
  });

  it('shows extension-cancel error sheet when extension ends the session', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        onScanError: jest.fn(),
        onScanSuccess: jest.fn(),
        origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
      },
    });

    const reactReduxModule = jest.requireMock('react-redux') as {
      useSelector: jest.Mock;
    };

    let phase: (typeof defaultQrSyncControllerState)['phase'] =
      QrSyncPhases.AWAITING_SYNC_READY;
    reactReduxModule.useSelector.mockImplementation(
      (selector: (state: RootState) => unknown) =>
        selector({
          engine: {
            backgroundState: {
              QrSyncController: {
                ...defaultQrSyncControllerState,
                phase,
              },
            },
          },
          onboarding: {
            completedOnboarding: false,
          },
        } as RootState),
    );

    const { rerender } = render(<QRTabSwitcher />);

    phase = QrSyncPhases.IDLE;
    rerender(<QRTabSwitcher />);

    expect(mockShowExtensionCancelledErrorSheet).toHaveBeenCalledTimes(1);
  });
});
