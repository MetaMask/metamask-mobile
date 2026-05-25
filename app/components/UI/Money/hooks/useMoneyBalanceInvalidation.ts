import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useEffect } from 'react';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { store } from '../../../../store';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { isMoneyAccountTx } from '../utils/moneyTransactionGuards';

const invalidateMoneyBalanceQueries = (address: string) => {
  ReactQueryService.queryClient.invalidateQueries({
    queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE, address],
    refetchType: 'all',
  });
  ReactQueryService.queryClient.invalidateQueries({
    queryKey: [
      MoneyAccountBalanceServiceQueryKeys.GET_MUSD_EQUIVALENT_VALUE,
      address,
    ],
    refetchType: 'all',
  });
};

export const useMoneyBalanceInvalidation = () => {
  useEffect(() => {
    const handleTransactionConfirmed = (transactionMeta: TransactionMeta) => {
      if (transactionMeta.status !== TransactionStatus.confirmed) return;
      if (!isMoneyAccountTx(transactionMeta)) return;

      const address = selectPrimaryMoneyAccount(store.getState())?.address;
      if (!address) return;

      invalidateMoneyBalanceQueries(address);
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
    };
  }, []);
};
