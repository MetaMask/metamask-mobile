import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import DiscoveryNotFoundScreen from './DiscoveryNotFound';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import { IconName } from '@metamask/design-system-react-native';

const mockSetInputState = jest.fn();

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('rive-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');

  const MockRive = MockReact.forwardRef(
    (
      props: { testID?: string; style?: unknown; onPlay?: () => void },
      ref: React.Ref<{ setInputState: typeof mockSetInputState }>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({
        setInputState: mockSetInputState,
      }));

      MockReact.useEffect(() => {
        props.onPlay?.();
      }, [props.onPlay]);

      return MockReact.createElement(MockView, {
        testID: props.testID ?? 'mock-rive',
        style: props.style,
      });
    },
  );

  return {
    __esModule: true,
    default: MockRive,
    Alignment: { Center: 'center' },
    Fit: { Contain: 'contain' },
  };
});

const TEST_CONFIG: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [
    { id: 'lock', icon: IconName.LockSlash, label: 'Unlock device' },
    { id: 'bt', icon: IconName.Connect, label: 'Enable Bluetooth' },
  ],
  errorToStepMap: {},
  accountManager: {
    getAccounts: jest.fn().mockResolvedValue([]),
    unlockAccounts: jest.fn().mockResolvedValue(undefined),
    forgetDevice: jest.fn().mockResolvedValue(undefined),
  },
  strings: {
    deviceFound: 'Device found',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts',
  },
};

describe('DiscoveryNotFoundScreen', () => {
  beforeEach(() => {
    mockSetInputState.mockReset();
  });

  it('renders the not-found animation', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(
      screen.getByTestId('discovery-not-found-animation'),
    ).toBeOnTheScreen();
  });

  it('sets the not_found input state on play', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(mockSetInputState).toHaveBeenCalledWith(
      'Ledger_states',
      'not_found',
      true,
    );
  });

  it('renders the device not found title', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(screen.getByText('Device not found')).toBeOnTheScreen();
  });

  it('renders troubleshooting items', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(screen.getByText('Unlock device')).toBeOnTheScreen();
    expect(screen.getByText('Enable Bluetooth')).toBeOnTheScreen();
  });

  it('renders retry button and calls onRetry when pressed', () => {
    const onRetry = jest.fn();
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} onRetry={onRetry} />);

    const button = screen.getByTestId('discovery-retry-button');
    expect(button).toBeOnTheScreen();

    fireEvent.press(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(
      screen.queryByTestId('discovery-retry-button'),
    ).not.toBeOnTheScreen();
  });

  it('renders back button and calls onBack when pressed', () => {
    const onBack = jest.fn();
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} onBack={onBack} />);

    const backButton = screen.getByTestId('discovery-not-found-back');
    expect(backButton).toBeOnTheScreen();

    fireEvent.press(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not render back button when onBack is not provided', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(
      screen.queryByTestId('discovery-not-found-back'),
    ).not.toBeOnTheScreen();
  });

  it('renders with empty troubleshooting items', () => {
    const config: DeviceUIConfig = {
      ...TEST_CONFIG,
      troubleshootingItems: [],
    };
    render(<DiscoveryNotFoundScreen config={config} />);

    expect(screen.getByText('Device not found')).toBeOnTheScreen();
  });

  it('renders retry button text from config strings', () => {
    const onRetry = jest.fn();
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} onRetry={onRetry} />);

    expect(screen.getByText('Try again')).toBeOnTheScreen();
  });
});
