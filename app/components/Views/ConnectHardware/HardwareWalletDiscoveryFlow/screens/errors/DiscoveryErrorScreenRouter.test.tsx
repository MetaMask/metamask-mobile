import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import DiscoveryErrorScreenRouter, {
  isDiscoveryErrorStep,
  shouldShowGenericProviderError,
} from './DiscoveryErrorScreenRouter';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('./DiscoveryErrorScreenLayout', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return ({ title, testID }: { title: string; testID?: string }) =>
    ReactActual.createElement(
      Text,
      { testID: testID ?? 'discovery-error-layout' },
      title,
    );
});

describe('DiscoveryErrorScreenRouter', () => {
  it('renders device locked screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.DeviceLocked}
        onRetry={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.ledger_is_locked')),
    ).toBeOnTheScreen();
  });

  it('renders device unresponsive screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.DeviceUnresponsive}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText(strings('ledger.unresponsive'))).toBeOnTheScreen();
  });

  it('renders app not open screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.AppNotOpen}
        onRetry={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.ethereum_app_closed')),
    ).toBeOnTheScreen();
  });

  it('renders bluetooth access denied screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.BluetoothAccessDenied}
        onNotNow={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.bluetooth_access_denied')),
    ).toBeOnTheScreen();
  });

  it('renders location access denied screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.LocationAccessDenied}
        onNotNow={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.location_access_denied')),
    ).toBeOnTheScreen();
  });

  it('renders nearby devices denied screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.NearbyDevicesDenied}
        onNotNow={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.nearby_devices_denied')),
    ).toBeOnTheScreen();
  });

  it('renders transport unavailable screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.TransportUnavailable}
        onNotNow={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.bluetooth_turned_off')),
    ).toBeOnTheScreen();
  });

  it('renders transport connection failed screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.TransportConnectionFailed}
        onRetry={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('ledger.bluetooth_connection_failed')),
    ).toBeOnTheScreen();
  });

  it('renders generic provider error screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Searching}
        showGenericProviderError
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('hardware_wallet.error.title')),
    ).toBeOnTheScreen();
  });

  it('passes walletType to generic error screen', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Searching}
        showGenericProviderError
        onRetry={jest.fn()}
        onContinue={jest.fn()}
        walletType={HardwareWalletType.Ledger}
      />,
    );

    expect(
      screen.getByText(strings('hardware_wallet.error.title')),
    ).toBeOnTheScreen();
  });

  it('returns null for non-error steps', () => {
    const { toJSON } = render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Searching}
        onRetry={jest.fn()}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('returns null for PermissionDenied step', () => {
    const { toJSON } = render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.PermissionDenied}
        onRetry={jest.fn()}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('returns null for Found step', () => {
    const { toJSON } = render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Found}
        onRetry={jest.fn()}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('returns null for Accounts step', () => {
    const { toJSON } = render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.Accounts}
        onRetry={jest.fn()}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('prioritizes generic provider error over step', () => {
    render(
      <DiscoveryErrorScreenRouter
        step={DiscoveryStep.DeviceLocked}
        showGenericProviderError
        onRetry={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(
      screen.getByText(strings('hardware_wallet.error.title')),
    ).toBeOnTheScreen();
  });
});

describe('isDiscoveryErrorStep', () => {
  it('identifies mapped discovery error steps', () => {
    expect(isDiscoveryErrorStep(DiscoveryStep.DeviceLocked)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.DeviceUnresponsive)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.AppNotOpen)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.BluetoothAccessDenied)).toBe(
      true,
    );
    expect(isDiscoveryErrorStep(DiscoveryStep.LocationAccessDenied)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.NearbyDevicesDenied)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.TransportUnavailable)).toBe(true);
    expect(isDiscoveryErrorStep(DiscoveryStep.TransportConnectionFailed)).toBe(
      true,
    );
  });

  it('returns false for non-error steps', () => {
    expect(isDiscoveryErrorStep(DiscoveryStep.Searching)).toBe(false);
    expect(isDiscoveryErrorStep(DiscoveryStep.PermissionDenied)).toBe(false);
    expect(isDiscoveryErrorStep(DiscoveryStep.Found)).toBe(false);
    expect(isDiscoveryErrorStep(DiscoveryStep.NotFound)).toBe(false);
    expect(isDiscoveryErrorStep(DiscoveryStep.Accounts)).toBe(false);
  });
});

describe('shouldShowGenericProviderError', () => {
  it('returns true when provider is in error state without a mapped step', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.ErrorState, null),
    ).toBe(true);
  });

  it('returns false when provider error maps to a discovery step', () => {
    expect(
      shouldShowGenericProviderError(
        ConnectionStatus.ErrorState,
        DiscoveryStep.DeviceLocked,
      ),
    ).toBe(false);
  });

  it('returns false when provider is not in error state', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.Disconnected, null),
    ).toBe(false);
  });

  it('returns false when provider is connected with error step', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.Connected, null),
    ).toBe(false);
  });

  it('returns false when provider is connecting with null step', () => {
    expect(
      shouldShowGenericProviderError(ConnectionStatus.Connecting, null),
    ).toBe(false);
  });
});
