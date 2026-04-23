/**
 * Figma: 446:13860
 * Static image: Ethereum diamond scene
 */
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const EthereumAppClosedImage = require('../../../../../images/ethereum-app-closed.png');

export interface LedgerEthAppClosedProps {
  onRetry?: () => void;
}

const LedgerEthAppClosed = ({ onRetry }: LedgerEthAppClosedProps) => (
  <LedgerDiscoveryErrorScreen
    imageSource={EthereumAppClosedImage}
    title={strings('ledger.ethereum_app_closed')}
    subtitle={strings('ledger.ethereum_app_closed_message')}
    primaryButton={
      onRetry
        ? {
            label: strings('ledger.try_again'),
            onPress: onRetry,
            testID: 'ledger-eth-closed-retry-button',
          }
        : undefined
    }
    testID="ledger-eth-closed-image"
  />
);

export default LedgerEthAppClosed;
