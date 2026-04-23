/**
 * Figma: 440:13020
 * Static image: Phone with location pin and lock icon
 */
import React from 'react';
import { Linking } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const LocationAccessDeniedImage = require('../../../../../images/location-access-denied.png');

export interface LedgerLocationAccessDeniedProps {
  onNotNow?: () => void;
}

const LedgerLocationAccessDenied = ({
  onNotNow,
}: LedgerLocationAccessDeniedProps) => (
  <LedgerDiscoveryErrorScreen
    imageSource={LocationAccessDeniedImage}
    title={strings('ledger.location_access_denied')}
    subtitle={strings('ledger.location_access_denied_message')}
    primaryButton={{
      label: strings('ledger.open_settings'),
      onPress: () => Linking.openSettings(),
      testID: 'ledger-location-denied-settings-button',
    }}
    secondaryButton={
      onNotNow
        ? {
            label: strings('ledger.not_now'),
            onPress: onNotNow,
            testID: 'ledger-location-denied-not-now-button',
          }
        : undefined
    }
    testID="ledger-location-denied-image"
  />
);

export default LedgerLocationAccessDenied;
