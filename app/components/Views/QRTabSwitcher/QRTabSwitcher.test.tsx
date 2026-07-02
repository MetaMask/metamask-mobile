import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import QRTabSwitcher, { QRTabSwitcherScreens } from './QRTabSwitcher';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import type { RootState } from '../../../reducers';
import { showExtensionCancelledErrorSheet } from '../../../core/QrSync/showExtensionCancelledErrorSheet';

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
      } as RootState),
  );

  return render(<QRTabSwitcher />);
};

const renderAddDeviceFlow = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState>,
) => {
  (useRoute as jest.Mock).mockReturnValue({
    params: {
      onScanError: jest.fn(),
      onScanSuccess: jest.fn(),
      origin: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
    },
  });

  return renderWithQrSyncState(qrSyncState);
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
        } as RootState),
    );

    const { rerender } = render(<QRTabSwitcher />);

    phase = QrSyncPhases.IDLE;
    rerender(<QRTabSwitcher />);

    expect(mockShowExtensionCancelledErrorSheet).toHaveBeenCalledTimes(1);
  });
});
