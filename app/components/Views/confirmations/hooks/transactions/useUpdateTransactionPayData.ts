import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { getMoneyAccountDepositCallsForAmount } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useUpdateTokenAmount } from './useUpdateTokenAmount';
import Logger from '../../../../../util/Logger';

/**
 * Generic dispatcher hook for updating transaction pay data when the user
 * changes the amount in a Custom Amount confirmation flow.
 *
 * Defaults to `useUpdateTokenAmount` (standard ERC-20 transfer path).
 * For non-standard transaction types it delegates to the feature-side pure util
 * that returns indexed calldata, then calls `updateAtomicBatchData` for each.
 *
 * Returns the same `{ updateTokenAmount }` shape as `useUpdateTokenAmount` so
 * any call-site can swap to this hook with a single import change.
 *
 * Adding a new feature type: export a pure `get<Feature>CallsForAmount` util
 * from the feature module and add a branch here keyed on the relevant `TransactionType`.
 */
export function useUpdateTransactionPayData() {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const moneyAccountVaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const { updateTokenAmount: defaultUpdateTokenAmount } =
    useUpdateTokenAmount();

  const updateTokenAmount = useCallback(
    (amountHuman: string) => {
      if (
        transactionMeta?.type === TransactionType.moneyAccountDeposit &&
        moneyAccountVaultConfig
      ) {
        getMoneyAccountDepositCallsForAmount({
          amountHuman,
          vaultConfig: moneyAccountVaultConfig,
        })
          .then((calls) =>
            Promise.all(
              calls.map((call) =>
                updateAtomicBatchData({ transactionId, ...call }),
              ),
            ),
          )
          .catch((error) =>
            Logger.error(
              error,
              'Failed to update money account deposit amount',
            ),
          );
        return;
      }

      defaultUpdateTokenAmount(amountHuman);
    },
    [
      defaultUpdateTokenAmount,
      moneyAccountVaultConfig,
      transactionId,
      transactionMeta?.type,
    ],
  );

  return { updateTokenAmount };
}
