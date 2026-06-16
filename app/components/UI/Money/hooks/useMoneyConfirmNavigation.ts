import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { type StackNavigationProp } from '@react-navigation/stack';
import { TransactionMeta } from '@metamask/transaction-controller';
import Routes from '../../../../constants/navigation/Routes';
import { store } from '../../../../store';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';
import { isMoneyDepositTx } from '../utils/moneyTransactionGuards';
import { hasPriorMoneyDeposit } from '../utils/firstTimeDeposit';

export function useMoneyConfirmNavigation() {
  const navigation = useNavigation();

  const handleDepositConfirm = useCallback(
    (tx?: TransactionMeta) => {
      console.log('[useMoneyConfirmNavigation] made it! ');
      const state = store.getState();

      console.log(
        'hasPriorMoneyDeposit: ',
        hasPriorMoneyDeposit(state, tx?.id ?? ''),
      );

      if (
        !tx ||
        !isMoneyDepositTx(tx) ||
        !selectMoneyFirstTimeDepositAnimationEnabledFlag(state) ||
        hasPriorMoneyDeposit(state, tx.id)
      ) {
        console.log('[useMoneyConfirmNavigation] navigating to home');
        navigation.navigate(Routes.MONEY.HOME);
        return;
      }

      console.log(
        '[useMoneyConfirmNavigation] navigating to first time deposit',
      );
      navigation.navigate(Routes.MONEY.FIRST_TIME_DEPOSIT);
    },
    [navigation],
  );

  return { handleDepositConfirm };
}
