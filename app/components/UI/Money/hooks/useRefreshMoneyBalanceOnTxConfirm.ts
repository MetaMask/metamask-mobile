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
import { getMoneyAccountBalanceQueryKey } from '../utils/moneyAccountBalanceQueryKey';
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

interface InFlightMoneyBalanceRefresh {
  /** Highest confirmed block this run must reach. Later confirms raise it. */
  minBlock?: number;
  promise: Promise<void>;
}

const highestMinBlock = (
  current: number | undefined,
  next: number | undefined,
): number | undefined => {
  if (next === undefined) {
    return current;
  }
  if (current === undefined) {
    return next;
  }
  return Math.max(current, next);
};

/**
 * Copy the balance the UI is already showing onto the fresh query key it is
 * about to observe. The key changes as soon as the confirm marker is stored,
 * and an empty key is not loading once its fetch is cancelled, which renders
 * as $0.00.
 *
 * @param address - Primary Money account address.
 * @param minBlock - Confirmed block the upcoming UI query will require.
 */
const seedFreshBalanceQuery = (
  address: string,
  minBlock: number | undefined,
) => {
  const cached = readBalanceSnapshot(address);
  if (cached === undefined) {
    return;
  }
  ReactQueryService.queryClient.setQueryData(
    getMoneyAccountBalanceQueryKey(address, {
      fresh: true,
      ...(minBlock !== undefined && { minBlock }),
    }),
    cached,
  );
};

/**
 * Capture the pre-refresh cached snapshot as a baseline, then request a fresh
 * balance (bypassing the Money API response cache, and requiring the API to
 * have reached the confirmed block when known). Retry up to MAX_RETRIES times
 * if subsequent reads match the baseline or the fetch fails. A later confirm
 * for the same address raises `flight.minBlock`; a read that used an older
 * block does not finish the loop. Fails visibly via Logger.error if the retry
 * budget exhausts.
 *
 * @param address - Primary Money account address.
 * @param flight - Shared state for this address's in-flight refresh.
 */
const refreshMoneyBalanceQueries = async (
  address: string,
  flight: InFlightMoneyBalanceRefresh,
) => {
  const baseline = readBalanceSnapshot(address);
  let sawSuccessfulRead = false;
  let lastError: Error | undefined;
  let attempt = 0;
  let totalAttempts = 0;

  Logger.log(`${LOG_PREFIX} Baseline snapshot established`, { baseline });

  while (attempt < MAX_RETRIES && totalAttempts < MAX_RETRIES * 2) {
    if (attempt > 0) {
      await sleep(
        calculateExponentialRetryDelay(
          attempt - 1,
          BASE_DELAY_MS,
          MAX_DELAY_MS,
        ),
      );
    }

    const minBlock = flight.minBlock;
    totalAttempts += 1;

    try {
      const next = await refreshMoneyAccountBalanceFresh(address, {
        minBlock,
      });
      sawSuccessfulRead = true;
      lastError = undefined;
      const changed = didBalanceChange(baseline, next);

      Logger.log(`${LOG_PREFIX} attempt ${attempt} result`, { changed, next });

      if (flight.minBlock !== minBlock) {
        attempt = 0;
        continue;
      }
      if (changed) return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      Logger.error(lastError, `${LOG_PREFIX} attempt ${attempt} failed`);
      if (flight.minBlock !== minBlock) {
        attempt = 0;
        continue;
      }
    }
    attempt += 1;
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
const inFlightRefreshByAddress = new Map<string, InFlightMoneyBalanceRefresh>();

/**
 * Joins the refresh already running for this address, or starts one.
 * A joined confirm raises the block floor the running loop must reach.
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
    existing.minBlock = highestMinBlock(existing.minBlock, minBlock);
    return existing.promise;
  }
  const flight: InFlightMoneyBalanceRefresh = {
    minBlock,
    promise: Promise.resolve(),
  };
  const run = refreshMoneyBalanceQueries(address, flight).finally(() => {
    if (inFlightRefreshByAddress.get(address) === flight) {
      inFlightRefreshByAddress.delete(address);
    }
  });
  flight.promise = run;
  inFlightRefreshByAddress.set(address, flight);
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
      seedFreshBalanceQuery(address, minBlock);
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
