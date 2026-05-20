import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { useCallback, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import { strings } from '../../../../../locales/i18n';
import { store } from '../../../../store';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { toChecksumAddress } from '../../../../util/address';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  TOAST_TRACKING_CLEANUP_DELAY_MS,
} from '../../Earn/constants/musd';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import useMoneyToasts from './useMoneyToasts';
import {
  useMoneyAccountDeposit,
  useMoneyAccountWithdrawal,
} from './useMoneyAccount';

const TELLER_INTERFACE = new ethers.utils.Interface([
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
]);

/**
 * Decodes the requested mUSD amount (in 6-decimal wei) from a teller
 * `deposit` or `withdraw` call. Returns `undefined` on malformed data.
 *
 * - deposit: `depositAmount` (arg 1) is the mUSD amount being deposited.
 * - withdraw: `minimumAssets` (arg 2) equals the requested mUSD payout, since
 * `buildMoneyAccountWithdrawBatch` sets it to the exact amount.
 */
function decodeTellerAmount(
  type: TransactionType,
  data: string | undefined,
): bigint | undefined {
  if (!data) return undefined;
  try {
    if (type === TransactionType.moneyAccountDeposit) {
      const decoded = TELLER_INTERFACE.decodeFunctionData('deposit', data);
      return BigInt(decoded[1].toString());
    }
    if (type === TransactionType.moneyAccountWithdraw) {
      const decoded = TELLER_INTERFACE.decodeFunctionData('withdraw', data);
      return BigInt(decoded[2].toString());
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'useMoneyTransactionStatus: failed to decode teller calldata',
    );
  }
  return undefined;
}

/**
 * Computes the mUSD → user-currency rate from current Redux state by mirroring
 * the calculation in `useMoneyAccountBalance`. Lives here (not exported from
 * that hook) so the status hook can resolve a rate on demand without
 * subscribing to balance-controller re-renders.
 */
function getMusdFiatRate(): BigNumber | undefined {
  const state = store.getState();
  const tokenMarketData = selectTokenMarketData(state);
  const currencyRates = selectCurrencyRates(state);
  const networkConfigurations = selectNetworkConfigurations(state);

  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];
  if (!musdAddress) return undefined;

  const checksumAddress = toChecksumAddress(musdAddress);
  const chainConfig = networkConfigurations?.[CHAIN_IDS.MAINNET];
  const nativeCurrency = chainConfig?.nativeCurrency;
  const conversionRate = nativeCurrency
    ? currencyRates?.[nativeCurrency]?.conversionRate
    : undefined;

  const priceInNativeCurrency =
    tokenMarketData?.[CHAIN_IDS.MAINNET]?.[checksumAddress]?.price ??
    tokenMarketData?.[CHAIN_IDS.MAINNET]?.[musdAddress]?.price;

  if (!conversionRate || priceInNativeCurrency === undefined) return undefined;
  return new BigNumber(priceInNativeCurrency).times(conversionRate);
}

/**
 * Formats a raw mUSD amount (6-decimal wei) as a fiat string in the user's
 * selected currency. Falls back to the raw mUSD string with a `mUSD` suffix
 * when the fiat rate is unavailable, so the toast still surfaces a real value.
 */
export function formatMusdAmountForToast(amountWei: bigint): string {
  const musdDecimal = new BigNumber(
    fromTokenMinimalUnitString(amountWei.toString(), MUSD_DECIMALS),
  );
  const rate = getMusdFiatRate();
  const currentCurrency = selectCurrentCurrency(store.getState());

  if (!rate || !currentCurrency) {
    return `${musdDecimal.toFixed(2)} mUSD`;
  }
  return moneyFormatFiat(musdDecimal.times(rate), currentCurrency);
}

/**
 * Hook to monitor Money Account deposit and withdrawal transaction status and
 * show appropriate toasts.
 *
 * This hook:
 * 1. Subscribes to TransactionController:transactionStatusUpdated and
 * transactionConfirmed events.
 * 2. Filters for moneyAccountDeposit / moneyAccountWithdraw transactions.
 * 3. Shows toasts based on transaction status: approved → in-progress toast,
 * confirmed → success toast with the decoded fiat amount, failed → failed
 * toast with a "Try again" CTA that re-invokes the original initiator
 * (`initiateDeposit` / `initiateWithdrawal`).
 * 4. Tracks shown toasts to prevent duplicates and cleans them up after the
 * final status to bound memory.
 *
 * This hook is mounted globally via MoneyTransactionMonitor so toasts surface
 * even when the user navigates away from Money screens.
 */
export const useMoneyTransactionStatus = () => {
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { initiateWithdrawal } = useMoneyAccountWithdrawal();
  const shownToastsRef = useRef<Set<string>>(new Set());

  // Wrap initiators so a failed retry surfaces via the same logger pattern
  // as the original calls — the retry tap shouldn't leave the user guessing.
  const retryDeposit = useCallback(() => {
    initiateDeposit().catch((error: unknown) => {
      Logger.error(
        error as Error,
        'useMoneyTransactionStatus: retryDeposit failed',
      );
    });
  }, [initiateDeposit]);

  const retryWithdrawal = useCallback(() => {
    initiateWithdrawal().catch((error: unknown) => {
      Logger.error(
        error as Error,
        'useMoneyTransactionStatus: retryWithdrawal failed',
      );
    });
  }, [initiateWithdrawal]);

  useEffect(() => {
    const scheduleCleanup = (
      transactionId: string,
      finalStatus: TransactionStatus,
    ) => {
      setTimeout(() => {
        shownToastsRef.current.delete(
          `${transactionId}-${TransactionStatus.approved}`,
        );
        shownToastsRef.current.delete(`${transactionId}-${finalStatus}`);
      }, TOAST_TRACKING_CLEANUP_DELAY_MS);
    };

    const isMoneyAccountTx = (transactionMeta: TransactionMeta) =>
      transactionMeta.type === TransactionType.moneyAccountDeposit ||
      transactionMeta.type === TransactionType.moneyAccountWithdraw;

    const reserveToastKey = (transactionId: string, status: string) => {
      const toastKey = `${transactionId}-${status}`;
      if (shownToastsRef.current.has(toastKey)) return undefined;
      shownToastsRef.current.add(toastKey);
      return toastKey;
    };

    // Resolve the in-progress / failed toast for the given transaction type.
    const showInProgressFor = (type: TransactionType) => {
      if (type === TransactionType.moneyAccountDeposit) {
        showToast(MoneyToastOptions.deposit.inProgress());
      } else {
        showToast(MoneyToastOptions.withdraw.inProgress());
      }
    };

    const showFailedFor = (type: TransactionType) => {
      if (type === TransactionType.moneyAccountDeposit) {
        showToast(MoneyToastOptions.deposit.failed({ onRetry: retryDeposit }));
      } else {
        showToast(
          MoneyToastOptions.withdraw.failed({ onRetry: retryWithdrawal }),
        );
      }
    };

    // Handle approved and failed via transactionStatusUpdated.
    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!isMoneyAccountTx(transactionMeta)) return;

      const { id: transactionId, status, type } = transactionMeta;

      switch (status) {
        case TransactionStatus.approved: {
          if (!reserveToastKey(transactionId, status)) return;
          showInProgressFor(type as TransactionType);
          break;
        }
        case TransactionStatus.failed: {
          if (!reserveToastKey(transactionId, status)) return;
          showFailedFor(type as TransactionType);
          scheduleCleanup(transactionId, TransactionStatus.failed);
          break;
        }
        default:
          break;
      }
    };

    // Handle confirmed via transactionConfirmed — fires alongside balance
    // updates so the success toast and balance change land together.
    const handleTransactionConfirmed = (transactionMeta: TransactionMeta) => {
      if (transactionMeta.status !== TransactionStatus.confirmed) return;
      if (!isMoneyAccountTx(transactionMeta)) return;

      const { id: transactionId, type } = transactionMeta;
      if (!reserveToastKey(transactionId, TransactionStatus.confirmed)) return;

      const amountWei = decodeTellerAmount(
        type as TransactionType,
        transactionMeta.txParams?.data as string | undefined,
      );
      const amountFiat =
        amountWei !== undefined ? formatMusdAmountForToast(amountWei) : '';

      if (type === TransactionType.moneyAccountDeposit) {
        showToast(MoneyToastOptions.deposit.success({ amountFiat }));
      } else {
        // TODO: Once Perps/Predict transfers ship, derive the destination
        // from transaction metadata. Today the only active outflow is the
        // Between-accounts transfer, so hardcode that label.
        showToast(
          MoneyToastOptions.withdraw.success({
            amountFiat,
            destination: strings('money.transfer_sheet.between_accounts'),
          }),
        );
      }
      scheduleCleanup(transactionId, TransactionStatus.confirmed);
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdated,
    );

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
    };
  }, [
    MoneyToastOptions.deposit,
    MoneyToastOptions.withdraw,
    retryDeposit,
    retryWithdrawal,
    showToast,
  ]);
};
