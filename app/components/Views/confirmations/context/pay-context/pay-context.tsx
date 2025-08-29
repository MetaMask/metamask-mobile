import React, { useContext, useMemo } from 'react';
import { useTransactionRequiredFiat } from '../../hooks/pay/useTransactionRequiredFiat';
import { useAutomaticTransactionPayToken } from '../../hooks/pay/useAutomaticTransactionPayToken';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  TransactionToken,
  useTransactionRequiredTokens,
} from '../../hooks/pay/useTransactionRequiredTokens';
import {
  TransactionPayToken,
  useTransactionPayToken,
} from '../../hooks/pay/useTransactionPayToken';
import { useTransactionPayTokenAmounts } from '../../hooks/pay/useTransactionPayTokenAmounts';

export interface PayContextParams {
  requiredTokens: TransactionToken[];
  payToken: TransactionPayToken | undefined;
  totalFiat: number;
  totalHuman: string | undefined;
}

const PayContext = React.createContext<PayContextParams>({
  payToken: undefined,
  requiredTokens: [],
  totalFiat: 0,
  totalHuman: undefined,
});

interface PayContextProviderProps {
  children: React.ReactNode;
}

export const PayContextProvider: React.FC<PayContextProviderProps> = ({
  children,
}) => {
  const { payToken } = useTransactionPayToken();
  const requiredTokens = useTransactionRequiredTokens();
  const { totalFiat, values } = useTransactionRequiredFiat({ requiredTokens });

  const { totalHuman } = useTransactionPayTokenAmounts({
    payToken,
    values,
  });

  useAutomaticTransactionPayToken({
    balanceOverrides: [
      {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
        balance: 10,
        chainId: CHAIN_IDS.ARBITRUM,
      },
    ],
    requiredTokens,
    totalFiat,
  });

  const result = useMemo(
    () => ({
      payToken,
      requiredTokens,
      totalFiat,
      totalHuman,
    }),
    [payToken, requiredTokens, totalFiat, totalHuman],
  );

  return <PayContext.Provider value={result}>{children}</PayContext.Provider>;
};

export const usePayContext = () => {
  const context = useContext(PayContext);

  if (!context) {
    throw new Error('usePayContext must be used within a PayContextProvider');
  }

  return context;
};
