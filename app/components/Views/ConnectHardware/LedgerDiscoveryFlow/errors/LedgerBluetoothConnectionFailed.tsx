/**
 * Figma: 440:13211
 * Static image: Phone with Bluetooth and lock icon
 */
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const BluetoothConnectionFailedImage = require('../../../../../images/bluetooth-connection-failed.png');

export interface LedgerBluetoothConnectionFailedProps {
  onRetry?: () => void;
}

const LedgerBluetoothConnectionFailed = ({
  onRetry,
}: LedgerBluetoothConnectionFailedProps) => (
  <LedgerDiscoveryErrorScreen
    imageSource={BluetoothConnectionFailedImage}
    title={strings('ledger.bluetooth_connection_failed')}
    subtitle={strings('ledger.bluetooth_connection_failed_reconnect')}
    primaryButton={
      onRetry
        ? {
            label: strings('ledger.try_again'),
            onPress: onRetry,
            testID: 'ledger-bt-failed-retry-button',
          }
        : undefined
    }
    testID="ledger-bt-failed-image"
  />
);

export default LedgerBluetoothConnectionFailed;
