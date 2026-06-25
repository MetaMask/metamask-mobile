import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import AddDeviceToWallet from './index';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock(
  '../../../images/add_wallet_to_device.png',
  () => 'add_wallet_to_device_image',
);

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

const renderComponent = () => renderWithProvider(<AddDeviceToWallet />);

describe('AddDeviceToWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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

  describe('back navigation', () => {
    it('calls navigation.goBack when back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('add-device-to-wallet-back-button'));

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
          onScanSuccess: expect.any(Function),
          onScanError: expect.any(Function),
        }),
      );
    });

    it('shows verification sheet after the mock scan delay', () => {
      const { getByText } = renderComponent();

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
      });
    });

    it('shows verification sheet 300ms after onScanSuccess fires', () => {
      const { getByText } = renderComponent();

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      const { onScanSuccess } = mockCreateQRScannerNavDetails.mock
        .calls[0][0] as {
        onScanSuccess: (data: object, content?: string) => void;
      };

      act(() => {
        onScanSuccess({});
        jest.advanceTimersByTime(300);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE,
      });
    });

    it('clears the mock scan timer when onScanError fires', () => {
      const { getByText } = renderComponent();

      fireEvent.press(
        getByText(strings('app_settings.add_device.scan_qr_code_button')),
      );

      const { onScanError } = mockCreateQRScannerNavDetails.mock
        .calls[0][0] as {
        onScanError: () => void;
      };

      act(() => {
        onScanError();
        jest.advanceTimersByTime(2000);
      });

      // navigate was called once to open the QR scanner but the delayed
      // verification sheet navigate must NOT have fired after the error
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('DeviceEventEmitter', () => {
    it('switches to DeviceAdded screen when addDeviceVerificationDone event fires', async () => {
      const { queryByText } = renderComponent();

      await act(async () => {
        DeviceEventEmitter.emit('addDeviceVerificationDone');
      });

      await waitFor(() => {
        expect(
          queryByText(strings('app_settings.add_device.add_device_to_wallet')),
        ).not.toBeOnTheScreen();
      });
    });

    it('removes the event listener on unmount', () => {
      const removeSpy = jest.fn();
      jest.spyOn(DeviceEventEmitter, 'addListener').mockReturnValueOnce({
        remove: removeSpy,
      } as unknown as ReturnType<typeof DeviceEventEmitter.addListener>);

      const { unmount } = renderComponent();

      unmount();

      expect(removeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
