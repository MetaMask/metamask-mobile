import React from 'react';
import { Linking } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import DiscoveryErrorScreen from './DiscoveryErrorScreen';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';
import {
  DISCOVERY_ERROR_SCREEN_CONFIGS,
  type DiscoveryErrorScreenConfig,
  type DiscoveryErrorScreenVariant,
} from './discoveryErrorScreenConfigs';
import { strings } from '../../../../../../../locales/i18n';

const CONFIG = DISCOVERY_ERROR_SCREEN_CONFIGS;
const GENERIC_VARIANT: DiscoveryErrorScreenVariant = 'something-went-wrong';

const getButtonTestID = (
  config: DiscoveryErrorScreenConfig,
  button: 'primaryButton' | 'secondaryButton',
): string => {
  const testID = config[button]?.testID;
  if (!testID) {
    throw new Error(`${button} testID not found in config`);
  }
  return testID;
};

const renderScreen = (ui: React.ReactElement) =>
  renderWithProvider(ui, undefined, false);

describe('DiscoveryErrorScreen', () => {
  describe('variant rendering', () => {
    it('renders DeviceUnresponsive variant with title and subtitle', () => {
      const config = CONFIG[DiscoveryStep.DeviceUnresponsive];
      renderScreen(
        <DiscoveryErrorScreen variant={DiscoveryStep.DeviceUnresponsive} />,
      );

      expect(screen.getByText(strings(config.titleKey))).toBeOnTheScreen();
      expect(screen.getByText(strings(config.subtitleKey))).toBeOnTheScreen();
    });

    it.each([
      {
        variant: DiscoveryStep.DeviceUnresponsive,
        getTestID: () =>
          getButtonTestID(
            CONFIG[DiscoveryStep.DeviceUnresponsive],
            'primaryButton',
          ),
      },
      {
        variant: DiscoveryStep.DeviceLocked,
        getTestID: () =>
          getButtonTestID(
            CONFIG[DiscoveryStep.DeviceLocked],
            'secondaryButton',
          ),
      },
      {
        variant: DiscoveryStep.AppNotOpen,
        getTestID: () =>
          getButtonTestID(CONFIG[DiscoveryStep.AppNotOpen], 'primaryButton'),
      },
      {
        variant: DiscoveryStep.TransportConnectionFailed,
        getTestID: () =>
          getButtonTestID(
            CONFIG[DiscoveryStep.TransportConnectionFailed],
            'primaryButton',
          ),
      },
    ])(
      'renders $variant with working retry button',
      ({ variant, getTestID }) => {
        const onRetry = jest.fn();
        renderScreen(
          <DiscoveryErrorScreen
            variant={variant as DiscoveryErrorScreenVariant}
            onRetry={onRetry}
          />,
        );

        fireEvent.press(screen.getByTestId(getTestID()));
        expect(onRetry).toHaveBeenCalledTimes(1);
      },
    );

    it.each([
      DiscoveryStep.BluetoothAccessDenied,
      DiscoveryStep.LocationAccessDenied,
      DiscoveryStep.NearbyDevicesDenied,
      DiscoveryStep.TransportUnavailable,
    ])('renders %s with open-settings button', (variant) => {
      renderScreen(
        <DiscoveryErrorScreen
          variant={variant as DiscoveryErrorScreenVariant}
          onNotNow={jest.fn()}
        />,
      );
      expect(
        screen.getByTestId(
          getButtonTestID(
            CONFIG[variant as DiscoveryErrorScreenVariant],
            'primaryButton',
          ),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('button actions', () => {
    it('calls Linking.openSettings when open-settings button is pressed', () => {
      jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn());
      renderScreen(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.BluetoothAccessDenied}
          onNotNow={jest.fn()}
        />,
      );

      fireEvent.press(
        screen.getByTestId(
          getButtonTestID(
            CONFIG[DiscoveryStep.BluetoothAccessDenied],
            'primaryButton',
          ),
        ),
      );
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    it('calls onNotNow when not-now button is pressed', () => {
      const onNotNow = jest.fn();
      renderScreen(
        <DiscoveryErrorScreen
          variant={DiscoveryStep.BluetoothAccessDenied}
          onNotNow={onNotNow}
        />,
      );

      fireEvent.press(
        screen.getByTestId(
          getButtonTestID(
            CONFIG[DiscoveryStep.BluetoothAccessDenied],
            'secondaryButton',
          ),
        ),
      );
      expect(onNotNow).toHaveBeenCalledTimes(1);
    });
  });

  describe(`${GENERIC_VARIANT} variant`, () => {
    const genericConfig = CONFIG[GENERIC_VARIANT];

    it('renders continue and retry buttons', () => {
      renderScreen(
        <DiscoveryErrorScreen
          variant={GENERIC_VARIANT}
          onContinue={jest.fn()}
          onRetry={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId(getButtonTestID(genericConfig, 'primaryButton')),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(getButtonTestID(genericConfig, 'secondaryButton')),
      ).toBeOnTheScreen();
    });

    it('calls onContinue when continue button is pressed', () => {
      const onContinue = jest.fn();
      renderScreen(
        <DiscoveryErrorScreen
          variant={GENERIC_VARIANT}
          onContinue={onContinue}
        />,
      );

      fireEvent.press(
        screen.getByTestId(getButtonTestID(genericConfig, 'primaryButton')),
      );
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();
      renderScreen(
        <DiscoveryErrorScreen variant={GENERIC_VARIANT} onRetry={onRetry} />,
      );

      fireEvent.press(
        screen.getByTestId(getButtonTestID(genericConfig, 'secondaryButton')),
      );
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it.each([
      { walletType: HardwareWalletType.Ledger, expected: 'Ledger' },
      { walletType: 'keystone' as HardwareWalletType, expected: 'device' },
    ])(
      'passes subtitle params with $expected for $walletType wallet',
      ({ walletType, expected }) => {
        const params = genericConfig.getSubtitleParams?.(walletType);
        const subtitle = strings(genericConfig.subtitleKey, params);

        renderScreen(
          <DiscoveryErrorScreen
            variant={GENERIC_VARIANT}
            walletType={walletType}
            onRetry={jest.fn()}
            onContinue={jest.fn()}
          />,
        );

        expect(screen.getByText(subtitle)).toBeOnTheScreen();
      },
    );

    it('defaults walletType to Ledger when not provided', () => {
      const params = genericConfig.getSubtitleParams?.(
        HardwareWalletType.Ledger,
      );
      const subtitle = strings(genericConfig.subtitleKey, params);

      renderScreen(
        <DiscoveryErrorScreen
          variant={GENERIC_VARIANT}
          onContinue={jest.fn()}
          onRetry={jest.fn()}
        />,
      );

      expect(screen.getByText(subtitle)).toBeOnTheScreen();
    });
  });

  describe('missing action handlers', () => {
    it.each([
      {
        variant: DiscoveryStep.AppNotOpen as DiscoveryErrorScreenVariant,
        getTestID: () =>
          getButtonTestID(CONFIG[DiscoveryStep.AppNotOpen], 'primaryButton'),
      },
      {
        variant:
          DiscoveryStep.BluetoothAccessDenied as DiscoveryErrorScreenVariant,
        getTestID: () =>
          getButtonTestID(
            CONFIG[DiscoveryStep.BluetoothAccessDenied],
            'secondaryButton',
          ),
      },
      {
        variant: GENERIC_VARIANT,
        getTestID: () =>
          getButtonTestID(CONFIG[GENERIC_VARIANT], 'primaryButton'),
      },
    ])(
      'does not render button when handler is not provided for $variant',
      ({ variant, getTestID }) => {
        renderScreen(<DiscoveryErrorScreen variant={variant} />);
        expect(screen.queryByTestId(getTestID())).toBeNull();
      },
    );
  });
});
