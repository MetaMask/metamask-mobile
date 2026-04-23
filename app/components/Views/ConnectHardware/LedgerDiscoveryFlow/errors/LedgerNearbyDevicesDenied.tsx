/**
 * Figma: 173:4949
 * Static image: Phone with location pin and lock icon
 */
import React from 'react';
import { Linking } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const NearbyDevicesDeniedImage = require('../../../../../images/nearby-devices-denied.png');

export interface LedgerNearbyDevicesDeniedProps {
  onNotNow?: () => void;
}

const LedgerNearbyDevicesDenied = ({
  onNotNow,
}: LedgerNearbyDevicesDeniedProps) => (
  <LedgerDiscoveryErrorScreen
    imageSource={NearbyDevicesDeniedImage}
    title={strings('ledger.nearby_devices_denied')}
    subtitle={strings('ledger.nearby_devices_denied_message')}
    primaryButton={{
      label: strings('ledger.open_settings'),
      onPress: () => Linking.openSettings(),
      testID: 'ledger-nearby-denied-settings-button',
    }}
    secondaryButton={
      onNotNow
        ? {
            label: strings('ledger.not_now'),
            onPress: onNotNow,
            testID: 'ledger-nearby-denied-not-now-button',
          }
        : undefined
    }
    testID="ledger-nearby-denied-image"
  />
);

export default LedgerNearbyDevicesDenied;
