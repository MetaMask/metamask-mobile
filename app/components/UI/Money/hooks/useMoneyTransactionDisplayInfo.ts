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
import {
  buildMoneyActivityFiatLine,
  getTokenToEthPrice,
  type CurrencyRatesMap,
  type TokenMarketDataMap,
} from '../utils/moneyActivityFiat';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import { isMusdToken } from '../../Earn/constants/musd';
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
 * Symbols of major USD-pegged stablecoins. This set is used purely for *display
 * formatting* — stables render with 2 fixed decimals ("+1.00 USDC") while other
 * tokens use trimmed 6-decimal precision ("+0.02 LINK"). Pricing itself always
 * comes from the Price API (token→ETH market price × ETH→USD), the same path
 * every other token uses.
 */
const USD_PEGGED_STABLE_SYMBOLS = new Set([
  'USDC',
  'USDT',
  'DAI',
  'MUSD',
  'USDS',
  'PYUSD',
  'GUSD',
  'TUSD',
  'USDP',
]);

function isUsdPeggedStable(
  tokenAddress: string | undefined,
  symbol: string | undefined,
): boolean {
  if (isMusdToken(tokenAddress)) {
    return true;
  }
  return symbol ? USD_PEGGED_STABLE_SYMBOLS.has(symbol.toUpperCase()) : false;
}

/**
 * USD price for one whole unit of the pay token, or `undefined` when it can't
 * be determined (in which case the primary amount is left blank rather than
 * shown as a misleading "0.00").
 *
 * - Native token (e.g. ETH) → its `usdConversionRate`.
 * - Other ERC-20s (including USD-pegged stablecoins) → the Price API value, i.e. token→ETH market price × ETH→USD rate.
 */
function getPayTokenUsdPrice(args: {
  isNative: boolean;
  nativeTicker: string | undefined;
  chainId: Hex | undefined;
  tokenAddress: Hex | undefined;
  currencyRates: CurrencyRatesMap | undefined;
  tokenMarketData: TokenMarketDataMap | undefined;
}): BigNumber | undefined {
  const {
    isNative,
    nativeTicker,
    chainId,
    tokenAddress,
    currencyRates,
    tokenMarketData,
  } = args;

  const ethToUsdRate = currencyRates?.[ETH_TICKER]?.usdConversionRate;

  if (isNative) {
    const nativeToUsdRate = nativeTicker
      ? currencyRates?.[nativeTicker]?.usdConversionRate
      : undefined;
    return nativeToUsdRate && nativeToUsdRate > 0
      ? new BigNumber(nativeToUsdRate)
      : undefined;
  }

  if (!chainId || !tokenAddress || !ethToUsdRate || ethToUsdRate <= 0) {
    return undefined;
  }
  const tokenToEthPrice = getTokenToEthPrice(
    tokenMarketData,
    chainId,
    tokenAddress,
  );
  if (!tokenToEthPrice || tokenToEthPrice <= 0) {
    return undefined;
  }
  return new BigNumber(tokenToEthPrice).times(ethToUsdRate);
}

/**
 * Formats a token amount with symbol. USD-pegged stables use 2 fixed decimals
 * (e.g. "+1.00 USDC"); other tokens show up to 6 decimals with trailing zeros
 * trimmed (e.g. "+0.000445 ETH", "+0.02 LINK").
 *
 * Returns `''` when the amount is too small to represent at this precision
 * (it would render as "+0 TOKEN") since showing nothing is preferable to a misleading
 * zero.
 */
function formatPrimaryTokenAmount(
  amount: BigNumber,
  symbol: string,
  isStable: boolean,
): string {
  if (isStable) {
    const formatted = getIntlNumberFormatter(I18n.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(amount.toNumber());
    return `+${formatted} ${symbol}`;
  }
  const fixed = amount.toFixed(6, BigNumber.ROUND_DOWN);
  const trimmed = fixed.replace(/(\.\d*[1-9])0+$/, '$1').replace(/\.0+$/, '');
  if (trimmed === '0') {
    return '';
  }
  return `+${trimmed} ${symbol}`;
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

    // --- Primary amount ---
    // Prefer the mUSD transfer amount (set on simple confirmed txs / decoded
    // from calldata). For batch deposits it's absent, so fall back to
    // requiredAssets.
    //
    // `requiredAssets[0].amount` is always denominated in the mUSD deposit
    // target (6 decimals), i.e. the *USD value* of the deposit — NOT in the pay
    // token's own minimal units. So for every pay token (native or ERC-20) we
    // convert that USD value into the pay token amount via the pay token's USD
    // price. (Treating it as token minimal units is what produced the
    // "+0.00 LINK" bug — see MUSD-857.)
    //
    // NOTE — historic vs. calculated value:
    // For these MetaMask Pay deposit rows the pay-token amount is NOT a
    // historic on-chain figure. The signed batch is `approve`/`deposit` of
    // *mUSD* (the pay-token → mUSD conversion happens off-batch in Pay's
    // routing), so the amount of LINK/ETH/etc. the user actually spent is
    // never persisted on the tx. The authoritative value is the
    // *fiat* (`targetFiat` / the mUSD target); the token amount below is
    // calculated based on current token price and so will drift as the token
    // price moves. This mirrors how the rest of the app renders Pay post-quote
    // rows (see `getPostQuoteDisplay` in TransactionElement/utils.js).
    let primaryAmount = getMusdDisplayAmountFromTransactionMeta(tx);
    if (!primaryAmount && sourceTokenSymbol) {
      const requiredAsset = getRequiredAsset(tx);
      if (requiredAsset) {
        const usdValue = new BigNumber(requiredAsset.amount).dividedBy(1e6);
        const usdPrice = getPayTokenUsdPrice({
          isNative,
          nativeTicker,
          chainId: payTokenChainId,
          tokenAddress: payTokenAddress,
          currencyRates,
          tokenMarketData,
        });
        if (usdValue.isGreaterThan(0) && usdPrice?.isGreaterThan(0)) {
          const tokenAmount = usdValue.dividedBy(usdPrice);
          primaryAmount = formatPrimaryTokenAmount(
            tokenAmount,
            sourceTokenSymbol,
            isUsdPeggedStable(payTokenAddress, sourceTokenSymbol),
          );
        }
        // If the price isn't available, primaryAmount stays empty — the
        // fiatAmount line below still shows the correct value.
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
    };
  }, [
    tx,
    subtitle,
    currentCurrency,
    currencyRates,
    tokenMarketData,
    payToken,
    payTokenAddress,
    payTokenChainId,
    nativeTicker,
  ]);
}
