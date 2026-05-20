import React from 'react';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';

/**
 * MoneyTransactionMonitor - Mounts global transaction monitoring hooks for
 * the Money Account feature.
 *
 * This component is a mount point for persistent transaction monitoring hooks
 * so toasts continue to surface even when the user has navigated away from
 * Money screens.
 */
const MoneyTransactionMonitor: React.FC = () => {
  useMoneyTransactionStatus();
  return null;
};

export default MoneyTransactionMonitor;
