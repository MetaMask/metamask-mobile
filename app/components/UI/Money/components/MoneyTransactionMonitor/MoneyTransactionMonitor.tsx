import React from 'react';
import { useMoneyBalanceInvalidation } from '../../hooks/useMoneyBalanceInvalidation';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';

const MoneyTransactionMonitor: React.FC = () => {
  useMoneyTransactionStatus();
  useMoneyBalanceInvalidation();
  return null;
};

export default MoneyTransactionMonitor;
