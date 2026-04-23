/**
 * Figma: 483:4427
 * Rive animation: Ledger artboard with `error` trigger (red warning glow)
 */
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

export interface LedgerUnresponsiveProps {
  onBack?: () => void;
}

const LedgerUnresponsive = (_props: LedgerUnresponsiveProps) => (
  <LedgerDiscoveryErrorScreen
    artboardName="Ledger"
    stateMachineName="Ledger_states"
    stateTrigger="error"
    title={strings('ledger.unresponsive')}
    subtitle={strings('ledger.unresponsive_message')}
    testID="ledger-unresponsive-animation"
  />
);

export default LedgerUnresponsive;
