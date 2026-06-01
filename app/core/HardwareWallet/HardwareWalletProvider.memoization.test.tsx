import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { createAdapter } from './adapters';
import { HardwareWalletProvider } from './HardwareWalletProvider';
import { useHardwareWallet } from './contexts';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';

const mockUseQRSigningState = jest.fn();

jest.mock('./hooks', () => ({
  ...jest.requireActual('./hooks'),
  useQRSigningState: (...args: unknown[]) => mockUseQRSigningState(...args),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockAdapterInstance = {
  walletType: HardwareWalletType.Ledger,
  requiresDeviceDiscovery: true,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
  ensureDeviceReady: jest.fn().mockResolvedValue(true),
  isConnected: jest.fn().mockReturnValue(true),
  reset: jest.fn(),
  markFlowComplete: jest.fn(),
  isFlowComplete: jest.fn().mockReturnValue(false),
  resetFlowState: jest.fn(),
  destroy: jest.fn(),
  startDeviceDiscovery: jest.fn(),
  stopDeviceDiscovery: jest.fn(),
  ensurePermissions: jest.fn().mockResolvedValue(true),
  isTransportAvailable: jest.fn().mockReturnValue(true),
  onTransportStateChange: jest
    .fn()
    .mockImplementation((callback: (available: boolean) => void) => {
      callback(true);
      return jest.fn();
    }),
  getRequiredAppName: jest.fn().mockReturnValue('Ethereum'),
  getTransportDisabledErrorCode: jest.fn().mockReturnValue('BluetoothDisabled'),
};

jest.mock('./adapters', () => ({
  createAdapter: jest.fn(() => mockAdapterInstance),
}));

jest.mock('../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue({ name: 'built-event' }),
      }),
    }),
  }),
}));

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    observeState: jest.fn(() => ({
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
    open: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('./components', () => ({
  HardwareWalletBottomSheet: () => null,
}));

describe('HardwareWalletProvider memoization', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockCreateAdapter = createAdapter as jest.MockedFunction<
    typeof createAdapter
  >;
  let qrState: {
    pendingScanRequest: undefined;
    isSigningQRObject: boolean;
    setRequestCompleted: jest.Mock;
    isRequestCompleted: boolean;
    cancelQRScanRequestIfPresent: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(null);
    mockCreateAdapter.mockImplementation(() => mockAdapterInstance);
    qrState = {
      pendingScanRequest: undefined,
      isSigningQRObject: false,
      setRequestCompleted: jest.fn(),
      isRequestCompleted: false,
      cancelQRScanRequestIfPresent: jest.fn(),
    };
    // Return a fresh wrapper each time to emulate the regression this provider
    // memoization is meant to defend against, while keeping field refs stable.
    mockUseQRSigningState.mockImplementation(() => ({
      ...qrState,
    }));
  });

  it('keeps the provider context reference stable when QR fields are unchanged', () => {
    let firstContextValue: ReturnType<typeof useHardwareWallet> | undefined;
    let latestContextValue: ReturnType<typeof useHardwareWallet> | undefined;

    const ContextConsumer = () => {
      const hardwareWallet = useHardwareWallet();

      if (!firstContextValue) {
        firstContextValue = hardwareWallet;
      }
      latestContextValue = hardwareWallet;

      return <Text>{hardwareWallet.walletType ?? 'null'}</Text>;
    };

    const { rerender } = render(
      <HardwareWalletProvider>
        <ContextConsumer />
        <Text>first render</Text>
      </HardwareWalletProvider>,
    );

    rerender(
      <HardwareWalletProvider>
        <ContextConsumer />
        <Text>second render</Text>
      </HardwareWalletProvider>,
    );

    expect(latestContextValue).toBe(firstContextValue);
  });
});
