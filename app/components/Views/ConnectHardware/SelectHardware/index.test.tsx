import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SelectHardwareWallet from './index';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { HardwareDeviceTypes } from '../../../../constants/keyringTypes';
import { getConnectedDevicesCount } from '../../../../core/HardwareWallets/analytics';
import { AppThemeKey } from '../../../../util/theme/models';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../UI/Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(),
}));

jest.mock('../../../../core/HardwareWallets/analytics');

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockGetConnectedDevicesCount =
  getConnectedDevicesCount as jest.MockedFunction<
    typeof getConnectedDevicesCount
  >;

const initialState = {
  user: {
    appTheme: AppThemeKey.light,
  },
};

describe('SelectHardwareWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnectedDevicesCount.mockResolvedValue(0);
    // Reset mockCreateEventBuilder to return proper chained object
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders component with correct text', () => {
    renderWithProvider(<SelectHardwareWallet />, { state: initialState });

    expect(strings).toHaveBeenCalledWith('connect_hardware.select_hardware');
    expect(screen.getByText('connect_hardware.select_hardware')).toBeTruthy();
  });

  it('sets navigation options on mount', () => {
    renderWithProvider(<SelectHardwareWallet />, { state: initialState });

    expect(mockSetOptions).toHaveBeenCalled();
  });

  describe('Ledger button navigation', () => {
    it('tracks event and navigates to Ledger connection when pressed', async () => {
      const connectedDeviceCount = 2;
      mockGetConnectedDevicesCount.mockResolvedValue(connectedDeviceCount);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(mockGetConnectedDevicesCount).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CONNECT_HARDWARE_WALLET,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT_LEDGER);
    });

    it('includes connected devices count in metrics event', async () => {
      const connectedDeviceCount = 5;
      mockGetConnectedDevicesCount.mockResolvedValue(connectedDeviceCount);
      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn().mockReturnValue({});
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HardwareDeviceTypes.LEDGER,
        connected_device_count: connectedDeviceCount.toString(),
      });
      expect(mockBuild).toHaveBeenCalled();
    });

    it('handles zero connected devices count', async () => {
      mockGetConnectedDevicesCount.mockResolvedValue(0);
      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn().mockReturnValue({});
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HardwareDeviceTypes.LEDGER,
        connected_device_count: '0',
      });
    });
  });

  describe('QR Hardware button navigation', () => {
    it('tracks event and navigates to QR device connection when pressed', async () => {
      const connectedDeviceCount = 3;
      mockGetConnectedDevicesCount.mockResolvedValue(connectedDeviceCount);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const qrButton = getByTestId('qr-hardware-button');

      await qrButton.props.onPress();

      expect(mockGetConnectedDevicesCount).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CONNECT_HARDWARE_WALLET,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT_QR_DEVICE);
    });

    it('includes connected devices count in metrics event', async () => {
      const connectedDeviceCount = 1;
      mockGetConnectedDevicesCount.mockResolvedValue(connectedDeviceCount);
      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn().mockReturnValue({});
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const qrButton = getByTestId('qr-hardware-button');

      await qrButton.props.onPress();

      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HardwareDeviceTypes.QR,
        connected_device_count: connectedDeviceCount.toString(),
      });
      expect(mockBuild).toHaveBeenCalled();
    });
  });

  describe('useMetrics integration', () => {
    it('uses the useMetrics hook', () => {
      renderWithProvider(<SelectHardwareWallet />, { state: initialState });

      expect(mockCreateEventBuilder).toBeDefined();
      expect(mockTrackEvent).toBeDefined();
    });

    it('creates event builder with correct event type', async () => {
      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CONNECT_HARDWARE_WALLET,
      );
    });
  });

  describe('error handling', () => {
    it('continues navigation to Ledger when getConnectedDevicesCount fails', async () => {
      const error = new Error('Failed to get device count');
      mockGetConnectedDevicesCount.mockRejectedValue(error);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT_LEDGER);
    });

    it('continues navigation to QR when getConnectedDevicesCount fails', async () => {
      const error = new Error('Failed to get device count');
      mockGetConnectedDevicesCount.mockRejectedValue(error);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const qrButton = getByTestId('qr-hardware-button');

      await qrButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.HW.CONNECT_QR_DEVICE);
    });

    it('logs error when analytics tracking fails for Ledger', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Analytics failure');
      mockGetConnectedDevicesCount.mockRejectedValue(error);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SelectHardware] Failed to track analytics:',
        error,
      );

      consoleSpy.mockRestore();
    });

    it('logs error when analytics tracking fails for QR', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Analytics failure');
      mockGetConnectedDevicesCount.mockRejectedValue(error);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const qrButton = getByTestId('qr-hardware-button');

      await qrButton.props.onPress();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SelectHardware] Failed to track analytics:',
        error,
      );

      consoleSpy.mockRestore();
    });

    it('does not track analytics event when getConnectedDevicesCount fails for Ledger', async () => {
      const error = new Error('Failed to get device count');
      mockGetConnectedDevicesCount.mockRejectedValue(error);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const ledgerButton = getByTestId('ledger-hardware-button');

      await ledgerButton.props.onPress();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track analytics event when getConnectedDevicesCount fails for QR', async () => {
      const error = new Error('Failed to get device count');
      mockGetConnectedDevicesCount.mockRejectedValue(error);

      const { getByTestId } = renderWithProvider(<SelectHardwareWallet />, {
        state: initialState,
      });
      const qrButton = getByTestId('qr-hardware-button');

      await qrButton.props.onPress();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
