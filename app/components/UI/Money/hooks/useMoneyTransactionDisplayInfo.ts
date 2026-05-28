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
import { strings } from '../../../../../locales/i18n';
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
import {
  buildMoneyActivityFiatLine,
  getTokenToEthPrice,
  type CurrencyRatesMap,
  type TokenMarketDataMap,
} from '../utils/moneyActivityFiat';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import { ETH_TICKER } from '../constants/moneyTokens';
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
      return strings('money.transaction.deposited');
    case TransactionType.incoming:
    case TransactionType.tokenMethodTransfer:
    case TransactionType.tokenMethodTransferFrom:
      return strings('money.transaction.received');
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
    case TransactionType.tokenMethodTransfer:
    case TransactionType.tokenMethodTransferFrom:
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

// USD-pegged stablecoins are treated as $1 regardless of market data, which is
// often missing or noisy for them on Money Account chains.
const USD_PEGGED_STABLE_SYMBOLS = new Set(['MUSD', 'USDC', 'USDT', 'DAI']);

function isUsdPeggedStableSymbol(symbol: string | undefined): boolean {
  return (
    symbol !== undefined && USD_PEGGED_STABLE_SYMBOLS.has(symbol.toUpperCase())
  );
}

/**
 * USD price for the pay token, used to convert the 6-decimal USD-equivalent
 * stored in `requiredAssets[0].amount` into a pay-token amount.
 *
 * - Native pay tokens: `currencyRates[ticker].usdConversionRate`.
 * - USD-pegged stables: 1 (market data is unreliable on Money Account chains).
 * - Other ERC-20s: `tokenMarketData` token→ETH × ETH→USD from `currencyRates`.
 * - Returns `undefined` when no reliable price is available.
 */
function getPayTokenUsdPrice(args: {
  isNative: boolean;
  ticker: string | undefined;
  symbol: string | undefined;
  chainId: Hex | undefined;
  tokenAddress: Hex | undefined;
  currencyRates: CurrencyRatesMap | undefined;
  tokenMarketData: TokenMarketDataMap | undefined;
}): number | undefined {
  const {
    isNative,
    ticker,
    symbol,
    chainId,
    tokenAddress,
    currencyRates,
    tokenMarketData,
  } = args;

  if (isNative) {
    const rate = ticker
      ? currencyRates?.[ticker]?.usdConversionRate
      : undefined;
    return rate && rate > 0 ? rate : undefined;
  }

  if (isUsdPeggedStableSymbol(symbol)) {
    return 1;
  }

  if (!chainId || !tokenAddress) {
    return undefined;
  }

  const tokenToEth = getTokenToEthPrice(tokenMarketData, chainId, tokenAddress);
  const ethToUsd = currencyRates?.[ETH_TICKER]?.usdConversionRate;
  if (
    tokenToEth === undefined ||
    tokenToEth <= 0 ||
    !ethToUsd ||
    ethToUsd <= 0
  ) {
    return undefined;
  }
  return tokenToEth * ethToUsd;
}

/**
 * Formats a pay-token amount with up to 6 decimal places, trimming trailing
 * zeros beyond the second decimal so whole values render as "1.00" rather than
 * "1" and small values keep their precision (e.g. "0.000445").
 */
function formatPayAmount(amount: BigNumber): string {
  const fixed = amount.toFixed(6, BigNumber.ROUND_DOWN);
  return fixed.replace(/(\.\d{2}\d*?)0+$/, '$1');
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

  // Native detection takes priority over the TokensController lookup — a chain
  // may register its native asset as a token entry, but we still want to use
  // the native ticker + CurrencyRateController rates rather than ERC-20 market
  // data in that case.
  const isNativePayToken = Boolean(
    payTokenAddress &&
      payTokenChainId &&
      isNativeTokenAddress(payTokenAddress, payTokenChainId),
  );

  const nativeTicker = useSelector((state: RootState) =>
    isNativePayToken && payTokenChainId
      ? selectTickerByChainId(state, payTokenChainId)
      : undefined,
  );

  const payToken = useSelector((state: RootState) =>
    !isNativePayToken && payTokenAddress && payTokenChainId
      ? selectSingleTokenByAddressAndChainId(
          state,
          payTokenAddress,
          payTokenChainId,
        )
      : undefined,
  );

  return useMemo(() => {
    const sourceTokenSymbol = isNativePayToken
      ? nativeTicker
      : payToken?.symbol;

    // --- Primary amount ---
    // mUSD transfers carry their own display amount via transferInformation;
    // for deposits / pay-token rows we derive it from the 6-decimal USD value
    // in requiredAssets and the pay token's USD price.
    let primaryAmount = getMusdDisplayAmountFromTransactionMeta(tx);
    if (!primaryAmount && sourceTokenSymbol) {
      const requiredAsset = getRequiredAsset(tx);
      if (requiredAsset) {
        const usdValue = new BigNumber(requiredAsset.amount).dividedBy(1e6);
        const payTokenUsdPrice = getPayTokenUsdPrice({
          isNative: isNativePayToken,
          ticker: nativeTicker,
          symbol: sourceTokenSymbol,
          chainId: payTokenChainId,
          tokenAddress: payTokenAddress,
          currencyRates,
          tokenMarketData,
        });
        if (
          usdValue.isGreaterThan(0) &&
          payTokenUsdPrice !== undefined &&
          payTokenUsdPrice > 0
        ) {
          const payAmount = usdValue.dividedBy(payTokenUsdPrice);
          primaryAmount = `+${formatPayAmount(payAmount)} ${sourceTokenSymbol}`;
        }
        // If we can't price the pay token, leave primaryAmount empty — the
        // fiat line still conveys the deposit value.
      }
    }

    // --- Fiat amount ---
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

    const description = subtitle ?? sourceTokenSymbol;

    return {
      label: getLabel(tx),
      description,
      primaryAmount,
      fiatAmount,
      isIncoming: isIncomingMoneyTransactionMeta(tx),
      icon: getIcon(tx),
    };
  }, [
    tx,
    subtitle,
    currentCurrency,
    currencyRates,
    tokenMarketData,
    payToken,
    nativeTicker,
    isNativePayToken,
    payTokenAddress,
    payTokenChainId,
  ]);
}
