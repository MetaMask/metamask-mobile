import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useEffect } from 'react';
import type { CanonicalMoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { store } from '../../../../store';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import {
  isMoneyAccountTx,
  isPerpsPredictMoneyActivity,
} from '../utils/moneyTransactionGuards';
import { invalidateMoneyAccountBalanceCaches } from '../utils/invalidateMoneyAccountBalanceCaches';
import Logger from '../../../../util/Logger';
import { calculateExponentialRetryDelay } from '../../../../util/exponential-retry';

const LOG_PREFIX = '[Money Balance Refresh]';

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 4000;

type MoneyBalanceSnapshot = CanonicalMoneyAccountBalanceResponse | undefined;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const readBalanceSnapshot = (address: string) =>
  ReactQueryService.queryClient.getQueryData<MoneyBalanceSnapshot>([
    MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
    address,
  ]);

const didBalanceChange = (
  before: MoneyBalanceSnapshot,
  after: MoneyBalanceSnapshot,
) => before?.totalBalance !== after?.totalBalance;

/**
 * Capture the pre-invalidation cached snapshot as a baseline, then invalidate +
 * refetch and compare. Retry up to MAX_RETRIES times if subsequent reads are
 * byte-identical to baseline. Guards against RPC nodes / API indexes serving
 * stale reads immediately after a `transactionConfirmed` event. Fails visibly
 * via Logger.error if the retry budget exhausts.
 */
const refreshMoneyBalanceQueries = async (address: string) => {
  const baseline = readBalanceSnapshot(address);

  Logger.log(`${LOG_PREFIX} Baseline snapshot established`, { baseline });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(
        calculateExponentialRetryDelay(
          attempt - 1,
          BASE_DELAY_MS,
          MAX_DELAY_MS,
        ),
      );
    }

    await invalidateMoneyAccountBalanceCaches(address);
    const next = readBalanceSnapshot(address);
    const changed = didBalanceChange(baseline, next);

    Logger.log(`${LOG_PREFIX} attempt ${attempt} result`, { changed, next });

    if (changed) return;
  }

  Logger.error(
    new Error(
      `${LOG_PREFIX} Balance unchanged after ${MAX_RETRIES} retries; awaiting 30s auto-poll`,
    ),
  );
};

export const useRefreshMoneyBalanceOnTxConfirm = () => {
  useEffect(() => {
    const handleTransactionConfirmed = (transactionMeta: TransactionMeta) => {
      if (transactionMeta.status !== TransactionStatus.confirmed) return;

      const address = selectPrimaryMoneyAccount(store.getState())?.address;
      if (!address) return;

      // Direct Money txs (deposit/withdraw) plus Perps/Predict transfers to or
      // from the Money account (paid with mUSD via MetaMask Pay), which also
      // move mUSD and so must refresh the balance.
      const affectsMoneyBalance =
        isMoneyAccountTx(transactionMeta) ||
        isPerpsPredictMoneyActivity(transactionMeta);
      if (!affectsMoneyBalance) return;

      refreshMoneyBalanceQueries(address).catch((error) => {
        Logger.error(error, `${LOG_PREFIX} Balance refresh failed`);
      });
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
