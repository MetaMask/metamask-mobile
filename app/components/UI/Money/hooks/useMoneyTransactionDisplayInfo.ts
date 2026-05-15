import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  type TransactionMeta,
  type RequiredAsset,
  TransactionType,
} from '@metamask/transaction-controller';
import { type Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { IconName } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import type { RootState } from '../../../../reducers';
import {
  getMusdDisplayAmountFromTransactionMeta,
  isIncomingMoneyTransactionMeta,
} from '../constants/activityStyles';
import { buildMoneyActivityFiatLine } from '../utils/moneyActivityFiat';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import { fromTokenMinimalUnit } from '../../../../util/number/bigint';
import type {
  MoneyActivityTitleKey,
  MoneyActivityTransactionMeta,
} from '../constants/mockActivityData';

export interface MoneyTransactionDisplayInfo {
  label: string;
  description: string | undefined;
  primaryAmount: string;
  fiatAmount: string;
  isIncoming: boolean;
  icon: IconName;
  sourceTokenSymbol: string | undefined;
  sourceTokenImage: string | undefined;
  /** Set only for native tokens (e.g. ETH) so the item can render the network logo. */
  sourceTokenChainId: Hex | undefined;
}

function titleKeyToLabel(key: MoneyActivityTitleKey): string {
  switch (key) {
    case 'added':
      return strings('money.transaction.added');
    case 'deposited':
      return strings('money.transaction.deposited');
    case 'received':
      return strings('money.transaction.received');
    case 'card_transaction':
      return strings('money.transaction.card_transaction');
    case 'converted':
      return strings('money.transaction.converted');
    case 'sent':
      return strings('money.transaction.sent');
    case 'transferred':
      return strings('money.transaction.transferred');
    default:
      return strings('money.transaction.received');
  }
}

function getLabelForTransactionType(type: TransactionType | undefined): string {
  if (!type) {
    return strings('money.transaction.deposited');
  }
  switch (type) {
    case TransactionType.moneyAccountDeposit:
    case TransactionType.incoming:
      return strings('money.transaction.deposited');
    case TransactionType.moneyAccountWithdraw:
    case TransactionType.simpleSend:
      return strings('money.transaction.sent');
    case TransactionType.musdConversion:
      return strings('money.transaction.converted');
    default:
      return strings('money.transaction.received');
  }
}

function getMoneySubtitle(tx: TransactionMeta): string | undefined {
  const extended = tx as MoneyActivityTransactionMeta;
  return extended.moneySubtitle;
}

function getLabel(tx: TransactionMeta): string {
  const extended = tx as MoneyActivityTransactionMeta;
  if (extended.moneyActivityTitleKey) {
    return titleKeyToLabel(extended.moneyActivityTitleKey);
  }
  // For EIP-7702 batch transactions, derive the label from the most significant
  // nested transaction type (e.g. moneyAccountDeposit, moneyAccountWithdraw).
  if (tx.type === TransactionType.batch) {
    const moneyNestedType = tx.nestedTransactions?.find(
      (nested) =>
        nested.type === TransactionType.moneyAccountDeposit ||
        nested.type === TransactionType.moneyAccountWithdraw,
    )?.type;
    if (moneyNestedType) {
      return getLabelForTransactionType(moneyNestedType);
    }
  }
  return getLabelForTransactionType(tx.type);
}

function titleKeyToIcon(key: MoneyActivityTitleKey): IconName {
  switch (key) {
    case 'added':
      return IconName.Add;
    case 'deposited':
      return IconName.Add;
    case 'received':
      return IconName.Arrow2Down;
    case 'card_transaction':
      return IconName.Card;
    case 'converted':
      return IconName.Refresh;
    case 'sent':
      return IconName.Arrow2UpRight;
    case 'transferred':
      return IconName.SwapHorizontal;
    default:
      return IconName.Arrow2Down;
  }
}

function getIconForTransactionType(
  type: TransactionType | undefined,
): IconName {
  if (!type) {
    return IconName.Arrow2Down;
  }
  switch (type) {
    case TransactionType.moneyAccountDeposit:
      return IconName.Add;
    case TransactionType.incoming:
      return IconName.Arrow2Down;
    case TransactionType.musdConversion:
      return IconName.Refresh;
    case TransactionType.moneyAccountWithdraw:
      return IconName.SwapHorizontal;
    case TransactionType.simpleSend:
      return IconName.Arrow2UpRight;
    default:
      return IconName.Arrow2Down;
  }
}

function getIcon(tx: TransactionMeta): IconName {
  const extended = tx as MoneyActivityTransactionMeta;
  if (extended.moneyActivityTitleKey) {
    return titleKeyToIcon(extended.moneyActivityTitleKey);
  }
  // For EIP-7702 batch transactions, derive the icon from the most significant
  // nested transaction type.
  if (tx.type === TransactionType.batch) {
    const moneyNestedType = tx.nestedTransactions?.find(
      (nested) =>
        nested.type === TransactionType.moneyAccountDeposit ||
        nested.type === TransactionType.moneyAccountWithdraw,
    )?.type;
    if (moneyNestedType) {
      return getIconForTransactionType(moneyNestedType);
    }
  }
  return getIconForTransactionType(tx.type);
}

/**
 * Returns the first required asset from a pay transaction, if present.
 */
function getRequiredAsset(tx: TransactionMeta): RequiredAsset | undefined {
  return tx.requiredAssets?.[0];
}

/**
 * Formats a hex or decimal token minimal-unit amount into a human-readable
 * string with symbol, e.g. "+1.00 USDC".
 */
function buildSourceTokenAmount(
  rawAmount: string,
  decimals: number,
  symbol: string,
): string {
  const humanReadable = fromTokenMinimalUnit(rawAmount, decimals);
  const num = parseFloat(humanReadable);
  if (isNaN(num)) {
    return '';
  }
  const formatted = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(num);
  return `+${formatted} ${symbol}`;
}

/**
 * Returns true when `tokenAddress` is the native currency on `chainId`
 * (e.g. ETH on mainnet).
 */
function isNativeTokenAddress(tokenAddress: string, chainId: Hex): boolean {
  try {
    const nativeAddress = getNativeTokenAddress(chainId);
    return tokenAddress.toLowerCase() === nativeAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Derives display strings for a Money activity row backed by {@link TransactionMeta}.
 */
export function useMoneyTransactionDisplayInfo(
  tx: TransactionMeta,
  _moneyAddress: string | undefined,
): MoneyTransactionDisplayInfo {
  const subtitle = getMoneySubtitle(tx);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const payTokenAddress = tx.metamaskPay?.tokenAddress as Hex | undefined;
  const payTokenChainId = tx.metamaskPay?.chainId as Hex | undefined;

  // look up erc-20 tokens
  const payToken = useSelector((state: RootState) =>
    payTokenAddress && payTokenChainId
      ? selectSingleTokenByAddressAndChainId(
          state,
          payTokenAddress,
          payTokenChainId,
        )
      : undefined,
  );

  // Native token fallback - these are not in the token registry
  const nativeTicker = useSelector((state: RootState) => {
    if (payToken || !payTokenAddress || !payTokenChainId) {
      return undefined;
    }
    if (isNativeTokenAddress(payTokenAddress, payTokenChainId)) {
      return selectTickerByChainId(state, payTokenChainId);
    }
    return undefined;
  });

  return useMemo(() => {
    const isNative = Boolean(nativeTicker);

    const sourceTokenSymbol = payToken?.symbol ?? nativeTicker;
    const sourceTokenImage = payToken?.image;

    const sourceTokenChainId =
      isNative && payTokenChainId ? payTokenChainId : undefined;

    // --- Primary amount ---
    // Prefer transferInformation (set on simple confirmed txs).
    // For batch deposits it's absent, so fall back to requiredAssets.
    let primaryAmount = getMusdDisplayAmountFromTransactionMeta(tx);
    if (!primaryAmount && sourceTokenSymbol) {
      const requiredAsset = getRequiredAsset(tx);
      if (requiredAsset) {
        if (isNative) {
          // For native tokens requiredAssets[0].amount is stored
          // in USDC-equivalent 6-decimal units (the USD value of the deposit),
          // NOT in wei.

          const nativeToUsdRate = nativeTicker
            ? currencyRates?.[nativeTicker]?.usdConversionRate
            : undefined;
          const usdValue = new BigNumber(requiredAsset.amount).dividedBy(1e6);
          if (
            usdValue.isGreaterThan(0) &&
            nativeToUsdRate &&
            nativeToUsdRate > 0
          ) {
            const nativeAmount = usdValue.dividedBy(nativeToUsdRate);
            // Show up to 6 decimal places, trim trailing zeros.
            const fixed = nativeAmount.toFixed(6, BigNumber.ROUND_DOWN);
            const trimmed = fixed
              .replace(/(\.\d*[1-9])0+$/, '$1')
              .replace(/\.0+$/, '');
            primaryAmount = `+${trimmed} ${sourceTokenSymbol}`;
          }
          // If the rate isn't available, primaryAmount stays empty and we fall
          // through — the fiatAmount line will still show the correct value.
        } else {
          primaryAmount = buildSourceTokenAmount(
            requiredAsset.amount,
            payToken?.decimals ?? 6,
            sourceTokenSymbol,
          );
        }
      }
    }

    // --- Fiat amount ---
    // Prefer calculated market-rate value.
    let fiatAmount = buildMoneyActivityFiatLine(
      tx,
      currencyRates,
      currentCurrency,
      tokenMarketData,
    );
    if (!fiatAmount && currentCurrency) {
      const rawFiat = Number(tx.metamaskPay?.targetFiat);
      if (!isNaN(rawFiat) && rawFiat > 0) {
        fiatAmount = `+${moneyFormatFiat(new BigNumber(rawFiat), currentCurrency)}`;
      }
    }

    // Explicit moneySubtitle takes priority; otherwise use source token symbol
    const description = subtitle ?? sourceTokenSymbol;

    return {
      label: getLabel(tx),
      description,
      primaryAmount,
      fiatAmount,
      isIncoming: isIncomingMoneyTransactionMeta(tx),
      icon: getIcon(tx),
      sourceTokenSymbol,
      sourceTokenImage,
      sourceTokenChainId,
    };
  }, [
    tx,
    subtitle,
    currentCurrency,
    currencyRates,
    tokenMarketData,
    payToken,
    nativeTicker,
    payTokenChainId,
  ]);
}
