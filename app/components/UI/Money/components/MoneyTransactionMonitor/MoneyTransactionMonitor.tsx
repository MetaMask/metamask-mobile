import React from 'react';
import { useRefreshMoneyBalanceOnTxConfirm } from '../../hooks/useRefreshMoneyBalanceOnTxConfirm';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';
import { useMoneyFirstTimeDepositTracker } from '../../hooks/useMoneyFirstTimeDepositTracker';
import { useRetryPlusChargeOnDeposit } from '../../../../Views/ProHub/hooks/useRetryPlusChargeOnDeposit';

const MoneyTransactionMonitor: React.FC = () => {
  useMoneyTransactionStatus();
  useRefreshMoneyBalanceOnTxConfirm();
  useMoneyFirstTimeDepositTracker();
  useRetryPlusChargeOnDeposit();
  return null;
};

export default MoneyTransactionMonitor;
