/**
 * Figma: 440:13092
 * Static image: Phone with Bluetooth toggle off
 */
import React from 'react';
import { Linking } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const BluetoothOffImage = require('../../../../../images/bluetooth-turned-off.png');

export interface LedgerBluetoothOffProps {
  onNotNow?: () => void;
}

const LedgerBluetoothOff = ({ onNotNow }: LedgerBluetoothOffProps) => (
  <LedgerDiscoveryErrorScreen
    imageSource={BluetoothOffImage}
    title={strings('ledger.bluetooth_turned_off')}
    subtitle={strings('ledger.bluetooth_turned_off_message')}
    primaryButton={{
      label: strings('ledger.open_settings'),
      onPress: () => Linking.openSettings(),
      testID: 'ledger-bt-off-settings-button',
    }}
    secondaryButton={
      onNotNow
        ? {
            label: strings('ledger.not_now'),
            onPress: onNotNow,
            testID: 'ledger-bt-off-not-now-button',
          }
        : undefined
    }
    testID="ledger-bt-off-image"
  />
);

export default LedgerBluetoothOff;
