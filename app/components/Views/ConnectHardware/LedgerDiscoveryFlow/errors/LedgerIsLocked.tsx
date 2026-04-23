/**
 * Figma: 483:4494
 * Rive animation: Ledger artboard with `ledger_locked` trigger (padlock on display)
 */
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import LedgerDiscoveryErrorScreen from './LedgerDiscoveryErrorScreen';

export interface LedgerIsLockedProps {
  onRetry?: () => void;
}

const LedgerIsLocked = ({ onRetry }: LedgerIsLockedProps) => (
  <LedgerDiscoveryErrorScreen
    artboardName="Ledger"
    stateMachineName="Ledger_states"
    stateTrigger="ledger_locked"
    title={strings('ledger.ledger_is_locked')}
    subtitle={strings('ledger.ledger_locked_message_continue')}
    secondaryButton={
      onRetry
        ? {
            label: strings('ledger.try_again'),
            onPress: onRetry,
            testID: 'ledger-locked-retry-button',
          }
        : undefined
    }
    testID="ledger-locked-animation"
  />
);

export default LedgerIsLocked;
