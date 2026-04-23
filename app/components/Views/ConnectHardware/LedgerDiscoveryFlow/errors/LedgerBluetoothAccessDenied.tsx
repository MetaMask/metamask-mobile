/**
 * Figma: 440:12967
 * Static image: Phone with Bluetooth and lock icon
 */
import React from 'react';
import { Linking } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const BluetoothAccessDeniedImage = require('../../../../../images/bluetooth-access-denied.png');

export interface LedgerBluetoothAccessDeniedProps {
  onNotNow?: () => void;
}

const LedgerBluetoothAccessDenied = ({
  onNotNow,
}: LedgerBluetoothAccessDeniedProps) => (
  <LedgerDiscoveryErrorScreen
    imageSource={BluetoothAccessDeniedImage}
    title={strings('ledger.bluetooth_access_denied')}
    subtitle={strings('ledger.bluetooth_access_denied_message')}
    primaryButton={{
      label: strings('ledger.open_settings'),
      onPress: () => Linking.openSettings(),
      testID: 'ledger-bt-access-denied-settings-button',
    }}
    secondaryButton={
      onNotNow
        ? {
            label: strings('ledger.not_now'),
            onPress: onNotNow,
            testID: 'ledger-bt-access-denied-not-now-button',
          }
        : undefined
    }
    testID="ledger-bt-access-denied-image"
  />
);

export default LedgerBluetoothAccessDenied;
