import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { store } from '../../../../store';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';
import { isMoneyDepositTx } from '../utils/moneyTransactionGuards';
import { hasPriorMoneyDeposit } from '../utils/firstTimeDeposit';

export const useMoneyFirstTimeDepositTracker = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const handleTransactionConfirmed = (tx: TransactionMeta) => {
      if (tx.status !== TransactionStatus.confirmed) return;

      const state = store.getState();

      if (
        !isMoneyDepositTx(tx) ||
        !selectMoneyFirstTimeDepositAnimationEnabledFlag(state) ||
        hasPriorMoneyDeposit(state, tx.id)
      ) {
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
