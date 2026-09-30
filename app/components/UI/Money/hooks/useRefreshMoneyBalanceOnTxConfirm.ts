import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { hexToNumber, isStrictHexString } from '@metamask/utils';
import { useEffect } from 'react';
import type { CanonicalMoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { store } from '../../../../store';
import { setLastLocalMoneyFlow } from '../../../../core/redux/slices/moneyBalance';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import {
  isMoneyAccountTx,
  isPerpsPredictMoneyActivity,
} from '../utils/moneyTransactionGuards';
import { refreshMoneyAccountBalanceFresh } from '../utils/invalidateMoneyAccountBalanceCaches';
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
 * Confirmed receipts store `blockNumber` as a 0x-prefixed hex quantity. A
 * missing or non-hex value omits `minBlock` so the refresh still runs.
 * Unprefixed numeric strings are rejected: `hexToNumber` would read them as
 * hex (`'16'` → 22).
 *
 * @param blockNumber - Block number from the confirmed transaction meta.
 * @returns The block as a number, or undefined when it cannot be used.
 */
const toConfirmedMinBlock = (
  blockNumber: string | undefined,
): number | undefined => {
  if (!blockNumber || !isStrictHexString(blockNumber)) {
    return undefined;
  }
  return hexToNumber(blockNumber);
};

/**
 * Capture the pre-refresh cached snapshot as a baseline, then request a fresh
 * balance (bypassing the Money API response cache, and requiring the API to
 * have reached the confirmed block when known). Retry up to MAX_RETRIES times
 * if subsequent reads match the baseline or the fetch fails. Guards against
 * RPC nodes / API indexes serving stale reads immediately after a
 * `transactionConfirmed` event. Fails visibly via Logger.error if the retry
 * budget exhausts.
 *
 * @param address - Primary Money account address.
 * @param minBlock - Confirmed transaction block the API result must reach.
 */
const refreshMoneyBalanceQueries = async (
  address: string,
  minBlock?: number,
) => {
  const baseline = readBalanceSnapshot(address);
  let sawSuccessfulRead = false;
  let lastError: Error | undefined;

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

    try {
      const next = await refreshMoneyAccountBalanceFresh(address, {
        minBlock,
      });
      sawSuccessfulRead = true;
      lastError = undefined;
      const changed = didBalanceChange(baseline, next);

      Logger.log(`${LOG_PREFIX} attempt ${attempt} result`, { changed, next });

      if (changed) return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      Logger.error(lastError, `${LOG_PREFIX} attempt ${attempt} failed`);
    }
  }

  if (!sawSuccessfulRead && lastError) {
    Logger.error(
      lastError,
      `${LOG_PREFIX} Balance refresh failed after ${MAX_RETRIES} attempts`,
    );
    return;
  }

  Logger.error(
    new Error(
      `${LOG_PREFIX} Balance unchanged after ${MAX_RETRIES} retries; awaiting 30s auto-poll`,
    ),
  );
};

// Concurrent loops for one address bust each other's source caches and compare
// against a baseline the other has already moved.
const inFlightRefreshByAddress = new Map<string, Promise<void>>();

/**
 * Joins the refresh already running for this address, or starts one.
 *
 * @param address - Primary Money account address.
 * @param minBlock - Confirmed transaction block the API result must reach.
 * @returns The in-flight refresh for the address.
 */
const refreshMoneyBalanceQueriesOnce = (
  address: string,
  minBlock?: number,
): Promise<void> => {
  const existing = inFlightRefreshByAddress.get(address);
  if (existing) {
    return existing;
  }
  const run = refreshMoneyBalanceQueries(address, minBlock).finally(() => {
    inFlightRefreshByAddress.delete(address);
  });
  inFlightRefreshByAddress.set(address, run);
  return run;
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

      // Marks the live balance as ahead of anything the backend derives from
      // its on-chain ingest, so those surfaces can say they're catching up.
      // Scoped to the account that moved, so it cannot speak for another one.
      // `minBlock` also drives the Money balance query key's fresh-read options
      // for the post-confirm window (see useMoneyAccountBalance).
      const minBlock = toConfirmedMinBlock(transactionMeta.blockNumber);
      store.dispatch(
        setLastLocalMoneyFlow({
          address,
          confirmedAt: Date.now(),
          ...(minBlock !== undefined && { minBlock }),
        }),
      );

      refreshMoneyBalanceQueriesOnce(address, minBlock).catch((error) => {
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
