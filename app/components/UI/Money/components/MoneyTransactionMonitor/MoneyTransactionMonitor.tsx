import React from 'react';
import { useRefreshMoneyBalanceOnTxConfirm } from '../../hooks/useRefreshMoneyBalanceOnTxConfirm';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';

const MoneyTransactionMonitor: React.FC = () => {
  useMoneyTransactionStatus();
  useRefreshMoneyBalanceOnTxConfirm();
  return null;
};

export default MoneyTransactionMonitor;
