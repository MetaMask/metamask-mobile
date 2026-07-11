import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { useEffect, useRef } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Logger from '../../../../util/Logger';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import { strings } from '../../../../../locales/i18n';
import { store } from '../../../../store';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { getMemoizedInternalAccountByAddress } from '../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  renderShortAddress,
  toChecksumAddress,
} from '../../../../util/address';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  TOAST_TRACKING_CLEANUP_DELAY_MS,
} from '../../Earn/constants/musd';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import { TELLER_ABI } from '../utils/moneyAccountTransactions';
import {
  isMoneyAccountTx,
  isMoneyDepositTx,
  isPerpsPredictMoneyDeposit,
  isPerpsPredictMoneyWithdraw,
  nestedTxWithType,
  perpsPredictServiceFamily,
  resolveMoneyDepositIntent,
} from '../utils/moneyTransactionGuards';
import { shouldShowMoneyFirstTimeDepositAnimation } from '../utils/firstTimeDeposit';
import useMoneyToasts from './useMoneyToasts';
import {
  clearMoneyAccountDepositIntent,
  getMoneyAccountDepositIntent,
} from './useMoneyAccount';

const TELLER_INTERFACE = new ethers.utils.Interface(TELLER_ABI);
const ERC20_TRANSFER_INTERFACE = new ethers.utils.Interface([
  'function transfer(address to, uint256 amount)',
]);

function decodeErc20TransferRecipient(
  data: string | undefined,
): string | undefined {
  if (!data) return undefined;
  try {
    const [to] = ERC20_TRANSFER_INTERFACE.decodeFunctionData('transfer', data);
    return to as string;
  } catch (error) {
    Logger.error(
      error as Error,
      'useMoneyTransactionStatus: failed to decode erc20 transfer calldata',
    );
    return undefined;
  }
}

function resolveWithdrawDestination(
  transactionMeta: TransactionMeta,
): string | undefined {
  const transferNested = nestedTxWithType(
    transactionMeta,
    TransactionType.tokenMethodTransfer,
  );
  const recipient = decodeErc20TransferRecipient(transferNested?.data);
  if (!recipient) return undefined;
  const state = store.getState();
  const account = getMemoizedInternalAccountByAddress(state, recipient);
  if (!account) return renderShortAddress(recipient);
  const groupName =
    selectAccountToGroupMap(state)[account.id]?.metadata?.name?.trim();
  const accountName = account.metadata?.name?.trim();
  return (
    groupName ||
    accountName ||
    strings('money.toasts.withdraw_fallback_destination')
  );
}

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
      return BigInt(decoded[1].toString());
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

function formatMetamaskPayFiat(value: unknown): string | undefined {
  const fiat = Number(value);
  if (Number.isNaN(fiat) || fiat <= 0) return undefined;
  return moneyFormatFiat(
    new BigNumber(fiat),
    selectCurrentCurrency(store.getState()),
  );
}

function navigateToMoneyTransactionDetails(transactionId: string) {
  NavigationService.navigation.navigate(Routes.MONEY.TRANSACTION_DETAILS, {
    transactionId,
  });
}

const IN_PROGRESS_KEY = 'in-progress';
const FAILED_KEY = 'failed';
const CONFIRMED_KEY = 'confirmed';
export const IN_PROGRESS_DELAY_MS = 1500;

// Reads the freshest copy of a transaction from controller state. The deferred
// in-progress toast derives deposit intent from `metamaskPay`, which can be
// populated after the `approved` event that scheduled the toast without another
// status change re-delivering the meta — so the captured snapshot is unsafe for
// derivation.
function latestTransactionMeta(
  transactionId: string,
): TransactionMeta | undefined {
  return Engine.context.TransactionController.state.transactions.find(
    (tx) => tx.id === transactionId,
  );
}

export const useMoneyTransactionStatus = () => {
  const { showToast, closeToast, MoneyToastOptions } = useMoneyToasts();
  const shownToastsRef = useRef<Set<string>>(new Set());
  const pendingInProgressRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const pendingCleanupsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );

  useEffect(() => {
    const pendingInProgress = pendingInProgressRef.current;
    const pendingCleanups = pendingCleanupsRef.current;

    const cancelPendingInProgress = (transactionId: string) => {
      const timeoutId = pendingInProgress.get(transactionId);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        pendingInProgress.delete(transactionId);
      }
    };

    const scheduleCleanup = (transactionId: string, finalKey: string) => {
      const timeoutId = setTimeout(() => {
        pendingCleanups.delete(timeoutId);
        shownToastsRef.current.delete(`${transactionId}-${IN_PROGRESS_KEY}`);
        shownToastsRef.current.delete(`${transactionId}-${finalKey}`);
      }, TOAST_TRACKING_CLEANUP_DELAY_MS);
      pendingCleanups.add(timeoutId);
    };

    const reserveToastKey = (transactionId: string, key: string) => {
      const toastKey = `${transactionId}-${key}`;
      if (shownToastsRef.current.has(toastKey)) return undefined;
      shownToastsRef.current.add(toastKey);
      return toastKey;
    };

    // Prefer the intent captured when the deposit was initiated; fall back to
    // deriving it from the transaction's own payment data when it's missing.
    const resolveDepositIntent = (transactionMeta: TransactionMeta) =>
      getMoneyAccountDepositIntent(transactionMeta.batchId) ??
      resolveMoneyDepositIntent(transactionMeta);

    const showInProgressFor = (transactionMeta: TransactionMeta) => {
      const isSend = isPerpsPredictMoneyDeposit(transactionMeta);
      if (!isMoneyAccountTx(transactionMeta) && !isSend) return;
      if (!reserveToastKey(transactionMeta.id, IN_PROGRESS_KEY)) return;
      if (pendingInProgress.has(transactionMeta.id)) return;
      const onPress = () =>
        navigateToMoneyTransactionDetails(transactionMeta.id);
      const timeoutId = setTimeout(() => {
        pendingInProgress.delete(transactionMeta.id);
        if (isSend) {
          showToast(MoneyToastOptions.send.inProgress({ onPress }));
        } else if (isMoneyDepositTx(transactionMeta)) {
          const freshMeta =
            latestTransactionMeta(transactionMeta.id) ?? transactionMeta;
          const intent = resolveDepositIntent(freshMeta);
          showToast(MoneyToastOptions.deposit.inProgress({ intent, onPress }));
        } else {
          showToast(MoneyToastOptions.withdraw.inProgress());
        }
      }, IN_PROGRESS_DELAY_MS);
      pendingInProgress.set(transactionMeta.id, timeoutId);
    };

    const showFailedFor = (transactionMeta: TransactionMeta) => {
      const isSend = isPerpsPredictMoneyDeposit(transactionMeta);
      if (!isMoneyAccountTx(transactionMeta) && !isSend) return;
      cancelPendingInProgress(transactionMeta.id);
      if (!reserveToastKey(transactionMeta.id, FAILED_KEY)) return;
      const onPress = () =>
        navigateToMoneyTransactionDetails(transactionMeta.id);
      if (isSend) {
        showToast(MoneyToastOptions.send.failed({ onPress }));
      } else if (isMoneyDepositTx(transactionMeta)) {
        const intent = resolveDepositIntent(transactionMeta);
        showToast(MoneyToastOptions.deposit.failed({ intent, onPress }));
        clearMoneyAccountDepositIntent(transactionMeta.batchId);
      } else {
        showToast(MoneyToastOptions.withdraw.failed());
      }
      scheduleCleanup(transactionMeta.id, FAILED_KEY);
    };

    const showConfirmedFor = (transactionMeta: TransactionMeta) => {
      const isSend = isPerpsPredictMoneyDeposit(transactionMeta);
      const isReceive = isPerpsPredictMoneyWithdraw(transactionMeta);
      if (!isMoneyAccountTx(transactionMeta) && !isSend && !isReceive) return;
      // The in-progress toast has no timeout and is normally dismissed by the
      // final toast replacing it. It has actually been displayed only if its
      // key was reserved and its deferral timer already fired.
      const inProgressToastDisplayed =
        shownToastsRef.current.has(
          `${transactionMeta.id}-${IN_PROGRESS_KEY}`,
        ) && !pendingInProgress.has(transactionMeta.id);
      cancelPendingInProgress(transactionMeta.id);
      if (!reserveToastKey(transactionMeta.id, CONFIRMED_KEY)) return;
      const onPress = () =>
        navigateToMoneyTransactionDetails(transactionMeta.id);

      if (isSend) {
        const amountFiat = formatMetamaskPayFiat(
          transactionMeta.metamaskPay?.targetFiat,
        );
        const family = perpsPredictServiceFamily(transactionMeta);
        const destination = strings(
          family === 'predict'
            ? 'money.toasts.send_destination_predict'
            : 'money.toasts.send_destination_perps',
        );
        showToast(
          MoneyToastOptions.send.success({ amountFiat, destination, onPress }),
        );
        scheduleCleanup(transactionMeta.id, CONFIRMED_KEY);
        return;
      }

      if (isReceive) {
        const amountFiat = formatMetamaskPayFiat(
          transactionMeta.metamaskPay?.targetFiat,
        );
        showToast(
          MoneyToastOptions.deposit.success({
            amountFiat,
            intent: 'addMusd',
            onPress,
          }),
        );
        scheduleCleanup(transactionMeta.id, CONFIRMED_KEY);
        return;
      }

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

      const amountBaseUnit = decodeTellerAmount(decodeType, decodeData);
      const amountFiat =
        amountBaseUnit !== undefined
          ? formatMusdAmountForToast(amountBaseUnit)
          : undefined;

      if (isMoneyDepositTx(transactionMeta)) {
        // A first deposit is confirmed by the full-page animation takeover
        // instead of a toast, so the lingering in-progress toast must be
        // closed explicitly rather than replaced by the success toast.
        if (
          shouldShowMoneyFirstTimeDepositAnimation(
            store.getState(),
            transactionMeta,
          )
        ) {
          if (inProgressToastDisplayed) {
            closeToast();
          }
        } else {
          const intent = resolveDepositIntent(transactionMeta);
          showToast(
            MoneyToastOptions.deposit.success({ amountFiat, intent, onPress }),
          );
        }
        clearMoneyAccountDepositIntent(transactionMeta.batchId);
      } else {
        const destination =
          resolveWithdrawDestination(transactionMeta) ??
          strings('money.toasts.withdraw_fallback_destination');
        showToast(
          MoneyToastOptions.withdraw.success({ amountFiat, destination }),
        );
      }
      scheduleCleanup(transactionMeta.id, CONFIRMED_KEY);
    };

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
        case TransactionStatus.cancelled:
          showFailedFor(transactionMeta);
          break;
        case TransactionStatus.rejected:
          cancelPendingInProgress(transactionMeta.id);
          if (isMoneyDepositTx(transactionMeta)) {
            clearMoneyAccountDepositIntent(transactionMeta.batchId);
          }
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
      pendingInProgress.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingInProgress.clear();
      pendingCleanups.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingCleanups.clear();
    };
  }, [
    MoneyToastOptions.deposit,
    MoneyToastOptions.withdraw,
    MoneyToastOptions.send,
    showToast,
    closeToast,
  ]);
};
