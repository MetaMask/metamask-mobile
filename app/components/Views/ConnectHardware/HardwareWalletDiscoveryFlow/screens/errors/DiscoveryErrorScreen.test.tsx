import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import DiscoveryErrorScreen from './DiscoveryErrorScreen';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

jest.mock('./DiscoveryErrorScreenLayout', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');

  const MockLayout = ({
    title,
    subtitle,
    primaryButton,
    secondaryButton,
    testID,
    imageSource,
    artboardName,
    stateMachineName,
    stateTrigger,
  }: {
    title: string;
    subtitle: string;
    primaryButton?: { label: string; onPress: () => void; testID?: string };
    secondaryButton?: { label: string; onPress: () => void; testID?: string };
    testID?: string;
    imageSource?: unknown;
    artboardName?: string;
    stateMachineName?: string;
    stateTrigger?: string;
  }) =>
    ReactActual.createElement(
      Text,
      { testID: testID ?? 'discovery-error-layout' },
      title,
      ' | ',
      subtitle,
      primaryButton
        ? ReactActual.createElement(
            TouchableOpacity,
            {
              testID: primaryButton.testID ?? 'primary-button',
              onPress: primaryButton.onPress,
            },
            ReactActual.createElement(Text, null, primaryButton.label),
          )
        : null,
      secondaryButton
        ? ReactActual.createElement(
            TouchableOpacity,
            {
              testID: secondaryButton.testID ?? 'secondary-button',
              onPress: secondaryButton.onPress,
            },
            ReactActual.createElement(Text, null, secondaryButton.label),
          )
        : null,
    );

  MockLayout.displayName = 'DiscoveryErrorScreenLayout';
  return MockLayout;
});

describe('DiscoveryErrorScreen', () => {
  describe('variant rendering', () => {
    it('renders DeviceUnresponsive variant with rive props', () => {
      render(
        <DiscoveryErrorScreen variant={DiscoveryStep.DeviceUnresponsive} />,
      );

      expect(
        screen.getByText('ledger.unresponsive | ledger.unresponsive_message'),
      ).toBeOnTheScreen();
    });

    it('renders DeviceLocked variant with retry button', () => {
      const onRetry = jest.fn();
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.DeviceLocked}
          onRetry={onRetry}
        />,
      );

      expect(
        screen.getByTestId('ledger-locked-retry-button'),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('ledger-locked-retry-button'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders AppNotOpen variant with retry button', () => {
      const onRetry = jest.fn();
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.AppNotOpen}
          onRetry={onRetry}
        />,
      );

      expect(
        screen.getByTestId('ledger-eth-closed-retry-button'),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('ledger-eth-closed-retry-button'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders BluetoothAccessDenied variant with open-settings button', () => {
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.BluetoothAccessDenied}
          onNotNow={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('ledger-bt-access-denied-settings-button'),
      ).toBeOnTheScreen();
    });

    it('renders LocationAccessDenied variant', () => {
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.LocationAccessDenied}
          onNotNow={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('ledger-location-denied-settings-button'),
      ).toBeOnTheScreen();
    });

    it('renders NearbyDevicesDenied variant', () => {
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.NearbyDevicesDenied}
          onNotNow={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('ledger-nearby-denied-settings-button'),
      ).toBeOnTheScreen();
    });

    it('renders TransportUnavailable variant', () => {
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.TransportUnavailable}
          onNotNow={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId('ledger-bt-off-settings-button'),
      ).toBeOnTheScreen();
    });

    it('renders TransportConnectionFailed variant with retry button', () => {
      const onRetry = jest.fn();
      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.TransportConnectionFailed}
          onRetry={onRetry}
        />,
      );

      expect(
        screen.getByTestId('ledger-bt-failed-retry-button'),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('ledger-bt-failed-retry-button'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('something-went-wrong variant', () => {
    it('renders with continue and retry buttons', () => {
      const onContinue = jest.fn();
      const onRetry = jest.fn();

      render(
        <DiscoveryErrorScreen
          variant="something-went-wrong"
          onContinue={onContinue}
          onRetry={onRetry}
        />,
      );

      expect(
        screen.getByTestId('discovery-generic-error-continue-button'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('discovery-generic-error-retry-button'),
      ).toBeOnTheScreen();
    });

    it('passes subtitle params with Ledger device name for Ledger wallet', () => {
      render(
        <DiscoveryErrorScreen
          variant="something-went-wrong"
          walletType={HardwareWalletType.Ledger}
          onRetry={jest.fn()}
          onContinue={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          'hardware_wallet.errors.unknown_error:{"device":"Ledger"}',
        ),
      ).toBeOnTheScreen();
    });

    it('passes subtitle params with generic device name for non-Ledger wallet', () => {
      render(
        <DiscoveryErrorScreen
          variant="something-went-wrong"
          walletType={'keystone' as HardwareWalletType}
          onRetry={jest.fn()}
          onContinue={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          'hardware_wallet.errors.unknown_error:{"device":"device"}',
        ),
      ).toBeOnTheScreen();
    });

    it('calls onContinue when continue button is pressed', () => {
      const onContinue = jest.fn();

      render(
        <DiscoveryErrorScreen
          variant="something-went-wrong"
          onContinue={onContinue}
        />,
      );

      fireEvent.press(
        screen.getByTestId('discovery-generic-error-continue-button'),
      );
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();

      render(
        <DiscoveryErrorScreen
          variant="something-went-wrong"
          onRetry={onRetry}
        />,
      );

      fireEvent.press(
        screen.getByTestId('discovery-generic-error-retry-button'),
      );
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('open-settings button', () => {
    it('calls Linking.openSettings when pressed', () => {
      jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn());

      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.BluetoothAccessDenied}
          onNotNow={jest.fn()}
        />,
      );

      fireEvent.press(
        screen.getByTestId('ledger-bt-access-denied-settings-button'),
      );
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('not-now button', () => {
    it('calls onNotNow when pressed', () => {
      const onNotNow = jest.fn();

      render(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.BluetoothAccessDenied}
          onNotNow={onNotNow}
        />,
      );

      fireEvent.press(
        screen.getByTestId('ledger-bt-access-denied-not-now-button'),
      );
      expect(onNotNow).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing action handlers', () => {
    it('does not render retry button when onRetry is not provided', () => {
      render(<DiscoveryErrorScreen variant={DiscoveryStep.AppNotOpen} />);

      expect(screen.queryByTestId('ledger-eth-closed-retry-button')).toBeNull();
    });

    it('does not render not-now button when onNotNow is not provided', () => {
      render(
        <DiscoveryErrorScreen variant={DiscoveryStep.BluetoothAccessDenied} />,
      );

      expect(
        screen.queryByTestId('ledger-bt-access-denied-not-now-button'),
      ).toBeNull();
    });

    it('does not render continue button when onContinue is not provided', () => {
      render(<DiscoveryErrorScreen variant="something-went-wrong" />);

      expect(
        screen.queryByTestId('discovery-generic-error-continue-button'),
      ).toBeNull();
    });
  });

  describe('walletType default', () => {
    it('defaults walletType to Ledger when not provided', () => {
      render(
        <DiscoveryErrorScreen
          variant="something-went-wrong"
          onContinue={jest.fn()}
          onRetry={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          'hardware_wallet.errors.unknown_error:{"device":"Ledger"}',
        ),
      ).toBeOnTheScreen();
    });
  });
});
