import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import DiscoveryNotFoundScreen from './DiscoveryNotFound';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';
import { IconName } from '@metamask/design-system-react-native';

const mockFireState = jest.fn();

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
      props: { testID?: string; style?: unknown },
      ref: React.Ref<{ fireState: typeof mockFireState }>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({
        fireState: mockFireState,
      }));

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
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the not-found animation', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    expect(
      screen.getByTestId('discovery-not-found-animation'),
    ).toBeOnTheScreen();
  });

  it('fires the not_found animation state after mount', () => {
    render(<DiscoveryNotFoundScreen config={TEST_CONFIG} />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockFireState).toHaveBeenCalledWith('Ledger_states', 'not_found');
  });
});
