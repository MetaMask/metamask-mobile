import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { useEffect, useRef } from 'react';
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

const TELLER_INTERFACE = new ethers.utils.Interface([
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
]);

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

const IN_PROGRESS_KEY = 'in-progress';
const FAILED_KEY = 'failed';
const CONFIRMED_KEY = 'confirmed';
export const IN_PROGRESS_DELAY_MS = 1500;

export const useMoneyTransactionStatus = () => {
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const shownToastsRef = useRef<Set<string>>(new Set());
  const pendingInProgressRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  useEffect(() => {
    const pendingInProgress = pendingInProgressRef.current;

    const cancelPendingInProgress = (transactionId: string) => {
      const timeoutId = pendingInProgress.get(transactionId);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        pendingInProgress.delete(transactionId);
      }
    };

    const scheduleCleanup = (transactionId: string, finalKey: string) => {
      setTimeout(() => {
        shownToastsRef.current.delete(`${transactionId}-${IN_PROGRESS_KEY}`);
        shownToastsRef.current.delete(`${transactionId}-${finalKey}`);
      }, TOAST_TRACKING_CLEANUP_DELAY_MS);
    };

    const nestedTxWithType = (
      transactionMeta: TransactionMeta,
      targetType: TransactionType,
    ) =>
      transactionMeta.nestedTransactions?.find(
        (nested) => nested.type === targetType,
      );

    const isMoneyDepositTx = (transactionMeta: TransactionMeta) =>
      transactionMeta.type === TransactionType.moneyAccountDeposit ||
      Boolean(
        nestedTxWithType(transactionMeta, TransactionType.moneyAccountDeposit),
      );

    const isMoneyWithdrawTx = (transactionMeta: TransactionMeta) =>
      transactionMeta.type === TransactionType.moneyAccountWithdraw ||
      Boolean(
        nestedTxWithType(transactionMeta, TransactionType.moneyAccountWithdraw),
      );

    const isMoneyAccountTx = (transactionMeta: TransactionMeta) =>
      isMoneyDepositTx(transactionMeta) || isMoneyWithdrawTx(transactionMeta);

    const reserveToastKey = (transactionId: string, key: string) => {
      const toastKey = `${transactionId}-${key}`;
      if (shownToastsRef.current.has(toastKey)) return undefined;
      shownToastsRef.current.add(toastKey);
      return toastKey;
    };

    const showInProgressFor = (transactionMeta: TransactionMeta) => {
      if (!isMoneyAccountTx(transactionMeta)) return;
      if (!reserveToastKey(transactionMeta.id, IN_PROGRESS_KEY)) return;
      if (pendingInProgress.has(transactionMeta.id)) return;
      const timeoutId = setTimeout(() => {
        pendingInProgress.delete(transactionMeta.id);
        if (isMoneyDepositTx(transactionMeta)) {
          showToast(MoneyToastOptions.deposit.inProgress());
        } else {
          showToast(MoneyToastOptions.withdraw.inProgress());
        }
      }, IN_PROGRESS_DELAY_MS);
      pendingInProgress.set(transactionMeta.id, timeoutId);
    };

    const showFailedFor = (transactionMeta: TransactionMeta) => {
      if (!isMoneyAccountTx(transactionMeta)) return;
      cancelPendingInProgress(transactionMeta.id);
      if (!reserveToastKey(transactionMeta.id, FAILED_KEY)) return;
      if (isMoneyDepositTx(transactionMeta)) {
        showToast(MoneyToastOptions.deposit.failed());
      } else {
        showToast(MoneyToastOptions.withdraw.failed());
      }
      scheduleCleanup(transactionMeta.id, FAILED_KEY);
    };

    const showConfirmedFor = (transactionMeta: TransactionMeta) => {
      if (!isMoneyAccountTx(transactionMeta)) return;
      cancelPendingInProgress(transactionMeta.id);
      if (!reserveToastKey(transactionMeta.id, CONFIRMED_KEY)) return;

      const depositNested = nestedTxWithType(
        transactionMeta,
        TransactionType.moneyAccountDeposit,
      );
      const withdrawNested = nestedTxWithType(
        transactionMeta,
        TransactionType.moneyAccountWithdraw,
      );
      const nestedMatch = depositNested ?? withdrawNested;
      const decodeType =
        nestedMatch?.type ?? (transactionMeta.type as TransactionType);
      const decodeData =
        nestedMatch?.data ??
        (transactionMeta.txParams?.data as string | undefined);

      const amountWei = decodeTellerAmount(decodeType, decodeData);
      const amountFiat =
        amountWei !== undefined ? formatMusdAmountForToast(amountWei) : '';

      if (isMoneyDepositTx(transactionMeta)) {
        showToast(MoneyToastOptions.deposit.success({ amountFiat }));
      } else {
        // TODO: derive destination from tx metadata once Perps/Predict transfers ship.
        showToast(
          MoneyToastOptions.withdraw.success({
            amountFiat,
            destination: strings('money.transfer_sheet.between_accounts'),
          }),
        );
      }
      scheduleCleanup(transactionMeta.id, CONFIRMED_KEY);
    };

    const handleTransactionApproved = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => showInProgressFor(transactionMeta);

    const handleTransactionFailed = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => showFailedFor(transactionMeta);

    const handleTransactionDropped = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => showFailedFor(transactionMeta);

    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      switch (transactionMeta.status) {
        case TransactionStatus.approved:
          showInProgressFor(transactionMeta);
          break;
        case TransactionStatus.failed:
        case TransactionStatus.dropped:
        case TransactionStatus.rejected:
        case TransactionStatus.cancelled:
          showFailedFor(transactionMeta);
          break;
        default:
          break;
      }
    };

    const handleTransactionConfirmed = (transactionMeta: TransactionMeta) => {
      if (transactionMeta.status !== TransactionStatus.confirmed) return;
      showConfirmedFor(transactionMeta);
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionApproved',
      handleTransactionApproved,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionFailed',
      handleTransactionFailed,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionDropped',
      handleTransactionDropped,
    );
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
        'TransactionController:transactionApproved',
        handleTransactionApproved,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionFailed',
        handleTransactionFailed,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionDropped',
        handleTransactionDropped,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
      pendingInProgress.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingInProgress.clear();
    };
  }, [MoneyToastOptions.deposit, MoneyToastOptions.withdraw, showToast]);
};
