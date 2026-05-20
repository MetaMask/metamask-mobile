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
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
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

export const useMoneyTransactionStatus = () => {
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const shownToastsRef = useRef<Set<string>>(new Set());

  const navigateToMoneySheet = useCallback((screen: string) => {
    try {
      NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen,
      });
    } catch (error) {
      Logger.error(
        error as Error,
        'useMoneyTransactionStatus: retry navigation failed',
      );
    }
  }, []);

  const retryDeposit = useCallback(() => {
    navigateToMoneySheet(Routes.MONEY.MODALS.ADD_MONEY_SHEET);
  }, [navigateToMoneySheet]);

  const retryWithdrawal = useCallback(() => {
    navigateToMoneySheet(Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET);
  }, [navigateToMoneySheet]);

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
        // TODO: derive destination from tx metadata once Perps/Predict transfers ship.
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
