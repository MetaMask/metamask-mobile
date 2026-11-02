import React from 'react';
import { useRefreshMoneyBalanceOnTxConfirm } from '../../hooks/useRefreshMoneyBalanceOnTxConfirm';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';
import { useMoneyFirstTimeDepositTracker } from '../../hooks/useMoneyFirstTimeDepositTracker';

const MoneyTransactionMonitor: React.FC = () => {
  useMoneyTransactionStatus();
  useRefreshMoneyBalanceOnTxConfirm();
  useMoneyFirstTimeDepositTracker();
  return null;
};

export default MoneyTransactionMonitor;
