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
import Logger from '../../../../util/Logger';
import { calculateExponentialRetryDelay } from '../../../../util/exponential-retry';

const LOG_PREFIX = '[Money Balance Refresh]';

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 4000;

type MusdBalanceSnapshot = { balance: string } | undefined;
type MusdEquivalentSnapshot = { balanceOfInAssets: string } | undefined;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const readBalanceSnapshot = (address: string) => ({
  musd: ReactQueryService.queryClient.getQueryData<MusdBalanceSnapshot>([
    MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE,
    address,
  ]),
  equivalent:
    ReactQueryService.queryClient.getQueryData<MusdEquivalentSnapshot>([
      MoneyAccountBalanceServiceQueryKeys.GET_MUSD_EQUIVALENT_VALUE,
      address,
    ]),
});

const didBalanceChange = (
  before: ReturnType<typeof readBalanceSnapshot>,
  after: ReturnType<typeof readBalanceSnapshot>,
) =>
  before.musd?.balance !== after.musd?.balance ||
  before.equivalent?.balanceOfInAssets !== after.equivalent?.balanceOfInAssets;

const invalidateBalanceQueries = async (address: string) =>
  Promise.all([
    ReactQueryService.queryClient.invalidateQueries({
      queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE, address],
      refetchType: 'all',
    }),
    ReactQueryService.queryClient.invalidateQueries({
      queryKey: [
        MoneyAccountBalanceServiceQueryKeys.GET_MUSD_EQUIVALENT_VALUE,
        address,
      ],
      refetchType: 'all',
    }),
  ]);

/**
 * Capture the pre-invalidation cached snapshot as a baseline, then invalidate +
 * refetch and compare. Retry up to MAX_RETRIES times if subsequent reads are
 * byte-identical to baseline. Guards against RPC nodes serving stale reads
 * immediately after a `transactionConfirmed` event. Fails visibly via
 * Logger.error if the retry budget exhausts.
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

    await invalidateBalanceQueries(address);
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
      if (!isMoneyAccountTx(transactionMeta)) return;

      const address = selectPrimaryMoneyAccount(store.getState())?.address;
      if (!address) return;

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
