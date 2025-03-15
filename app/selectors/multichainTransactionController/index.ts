import { createDeepEqualSelector } from '../util';
import { isEvmAccountType } from '@metamask/keyring-api';
import { RootState } from '../../reducers';
import { selectSelectedInternalAccount } from '../accountsController';

export const selectMultichainTransactionControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainTransactionsController
    .nonEvmTransactions;

export const selectSelectedAccountMultichainTransactions =
  createDeepEqualSelector(
    selectMultichainTransactionControllerState,
    selectSelectedInternalAccount,
    (multichainTransactionControllerState, selectedAccount) => {
      console.log(
        'multichainTransactionControllerState',
        JSON.stringify(multichainTransactionControllerState, null, 2),
      );
      if (!selectedAccount) {
        return undefined;
      }

      if (isEvmAccountType(selectedAccount.type)) {
        return undefined;
      }

      return multichainTransactionControllerState[selectedAccount.id];
    },
  );
