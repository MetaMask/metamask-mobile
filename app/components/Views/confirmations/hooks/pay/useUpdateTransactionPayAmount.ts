import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { selectMoneyAccountDepositQuotePipelineEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import {
  updateAtomicBatchData,
  updateTransaction,
} from '../../../../../util/transaction-controller';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/hooks/useMoneyAccount';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from '../../../../UI/Money/utils/moneyAccountTransactions';
import { UpdateTransactionPayAmountCall } from '../../types/transactions';
import { hasTransactionType } from '../../utils/transaction';
import { prefixError } from '../../../../../util/transactions/error-prefix';
import {
  useTransactionPayFiatPayment,
  useTransactionPayRequiredTokens,
} from './useTransactionPayData';

const DEPOSIT_ERROR_PREFIX = 'Money Account Deposit: ';
const WITHDRAW_ERROR_PREFIX = 'Money Account Withdrawal: ';

type MoneyAccountAmountUpdater = (
  transactionMeta: TransactionMeta,
  amountHuman: string,
  recipientOverride?: Hex,
) => Promise<UpdateTransactionPayAmountCall[]>;

interface OptimizedAmountUpdate {
  amountHuman: string;
  promise: Promise<boolean>;
  transactionId: string;
}

export function useUpdateTransactionPayAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount } = useUpdateTokenAmount();
  const requiredTokens = useTransactionPayRequiredTokens();
  const fiatPayment = useTransactionPayFiatPayment();
  const accountOverride = useTransactionAccountOverride();
  const isMoneyAccountDepositQuotePipelineEnabled = useSelector(
    selectMoneyAccountDepositQuotePipelineEnabled,
  );
  const optimizedAmountUpdateRef = useRef<OptimizedAmountUpdate | undefined>(
    undefined,
  );
  const isMoneyAccountDeposit = Boolean(
    transactionMeta &&
      hasTransactionType(transactionMeta, [
        TransactionType.moneyAccountDeposit,
      ]),
  );
  const depositIntent =
    isMoneyAccountDeposit && transactionMeta
      ? getMoneyAccountDepositIntent(transactionMeta.batchId)
      : undefined;
  // Initially optimize only generic/convert crypto deposits. addMusd uses the
  // Relay max/gas-station path and card uses the multi-stage fiat path, so both
  // retain the existing pipeline until validated separately.
  const isAmountUpdateQuotePipelineEnabled = Boolean(
    isMoneyAccountDepositQuotePipelineEnabled &&
      isMoneyAccountDeposit &&
      (depositIntent === undefined || depositIntent === 'convert') &&
      !fiatPayment?.selectedPaymentMethodId,
  );

  const applyMoneyAccountAmountUpdates = useCallback(
    async (
      amountHuman: string,
      updater: MoneyAccountAmountUpdater,
      errorPrefix: string,
      recipientOverride?: Hex,
    ) => {
      if (!transactionMeta) {
        return;
      }

      let updates: UpdateTransactionPayAmountCall[];
      try {
        updates = await updater(
          transactionMeta,
          amountHuman,
          recipientOverride,
        );
      } catch (error) {
        throw prefixError(error, errorPrefix);
      }

      try {
        await Promise.all(
          updates.map(({ nestedTransactionIndex, transactionData }) =>
            updateAtomicBatchData({
              transactionId: transactionMeta.id,
              transactionIndex: nestedTransactionIndex,
              transactionData,
            }),
          ),
        );
      } catch (error) {
        throw prefixError(error, errorPrefix);
      }
    },
    [transactionMeta],
  );

  const updateOptimizedAmount = useCallback(
    (amountHuman: string, transactionId: string) => {
      // Core deduplicates only in-flight intents. Retain a successful prefetch
      // so Continue can reuse it instead of launching the pipeline again.
      const existingUpdate = optimizedAmountUpdateRef.current;
      if (
        existingUpdate?.amountHuman === amountHuman &&
        existingUpdate.transactionId === transactionId
      ) {
        return existingUpdate.promise;
      }

      const promise = Engine.context.TransactionPayController.updateAmount({
        transactionId,
        amountHuman,
      });
      optimizedAmountUpdateRef.current = {
        amountHuman,
        promise,
        transactionId,
      };

      promise.then(
        (isPublished) => {
          if (
            !isPublished &&
            optimizedAmountUpdateRef.current?.promise === promise
          ) {
            optimizedAmountUpdateRef.current = undefined;
          }
        },
        () => {
          if (optimizedAmountUpdateRef.current?.promise === promise) {
            optimizedAmountUpdateRef.current = undefined;
          }
        },
      );

      return promise;
    },
    [],
  );

  const updateTransactionPayAmount = useCallback(
    async (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      if (isMoneyAccountDeposit) {
        if (isAmountUpdateQuotePipelineEnabled) {
          await updateOptimizedAmount(amountHuman, transactionMeta.id);
          return;
        }

        syncMoneyAccountDepositRequiredAssets(
          transactionMeta,
          amountHuman,
          requiredTokens?.[0]?.decimals,
        );
        await applyMoneyAccountAmountUpdates(
          amountHuman,
          updateMoneyAccountDepositTokenAmount,
          DEPOSIT_ERROR_PREFIX,
        );
        return;
      }

      if (
        hasTransactionType(transactionMeta, [
          TransactionType.moneyAccountWithdraw,
        ])
      ) {
        await applyMoneyAccountAmountUpdates(
          amountHuman,
          updateMoneyAccountWithdrawTokenAmount,
          WITHDRAW_ERROR_PREFIX,
          accountOverride,
        );
        return;
      }

      updateTokenAmount(amountHuman);
    },
    [
      transactionMeta,
      applyMoneyAccountAmountUpdates,
      updateTokenAmount,
      requiredTokens,
      accountOverride,
      isMoneyAccountDeposit,
      isAmountUpdateQuotePipelineEnabled,
      updateOptimizedAmount,
    ],
  );

  return {
    isAmountUpdateQuotePipelineEnabled,
    updateTransactionPayAmount,
  };
}

function syncMoneyAccountDepositRequiredAssets(
  transactionMeta: TransactionMeta,
  amountHuman: string,
  decimals: number | undefined,
): void {
  const existing = transactionMeta.requiredAssets;
  if (!existing?.length || decimals === undefined) return;

  try {
    const amount = toHex(
      new BigNumber(amountHuman)
        .shiftedBy(decimals)
        .decimalPlaces(0, BigNumber.ROUND_UP)
        .toFixed(0),
    ) as Hex;
    if (existing[0].amount === amount) return;

    updateTransaction(
      {
        ...transactionMeta,
        requiredAssets: [{ ...existing[0], amount }, ...existing.slice(1)],
      },
      'Money Account deposit: sync requiredAssets amount',
    );
  } catch (error) {
    throw prefixError(error, DEPOSIT_ERROR_PREFIX);
  }
}
