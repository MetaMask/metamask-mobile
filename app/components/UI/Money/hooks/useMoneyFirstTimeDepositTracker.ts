import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { store } from '../../../../store';
import { shouldShowMoneyFirstTimeDepositAnimation } from '../utils/firstTimeDeposit';

export const useMoneyFirstTimeDepositTracker = () => {
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    const handleTransactionConfirmed = (tx: TransactionMeta) => {
      if (tx.status !== TransactionStatus.confirmed) return;

      if (!shouldShowMoneyFirstTimeDepositAnimation(store.getState(), tx)) {
        return;
      }

      navigation.navigate(Routes.MONEY.FIRST_TIME_DEPOSIT);
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
  }, [navigation]);
};
