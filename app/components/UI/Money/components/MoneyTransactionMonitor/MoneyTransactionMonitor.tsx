import React from 'react';
import { useMoneyTransactionStatus } from '../../hooks/useMoneyTransactionStatus';

const MoneyTransactionMonitor: React.FC = () => {
  useMoneyTransactionStatus();
  return null;
};

export default MoneyTransactionMonitor;
