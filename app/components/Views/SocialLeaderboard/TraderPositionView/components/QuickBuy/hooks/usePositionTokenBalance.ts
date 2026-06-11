import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatUnits } from 'ethers/lib/utils';
import {
  isNonEvmChainId,
  isNativeAddress,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import type { Hex, CaipChainId } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../../selectors/currencyRateController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../../../../../../../selectors/multichain/multichain';
import { addCurrencySymbol } from '../../../../../../../util/number/bigint';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import type { QuickBuyTarget } from '../types';
import {
  hasNonZeroHexBalance,
  getCachedNativeBalance,
  getCachedErc20Balance,
  getTokenPrice,
} from './tokenBalanceUtils';

/**
 * Resolves the current user's balance of the position token (i.e. the token
 * that would be *sold* in Sell mode). Returns a `BridgeToken` enriched with
 * `balance` (always set when the user holds the token) and, when available, a
 * priced `balanceFiat` / `currencyExchangeRate` / `tokenFiatAmount`.
 *
 * Returns `undefined` only when the user has no balance of the token, the
 * target is missing, or data is still loading.
 *
 * Mirrors the behaviour of the Bridge's `useTokensWithBalance` /
 * `calculateEvmBalances`: a held-but-unpriceable token is still surfaced (with
 * `$0.00` fiat and an undefined `currencyExchangeRate`), so downstream flows
 * can let the user act on the token amount instead of hiding it entirely.
 */
export const usePositionTokenBalance = (
  target: QuickBuyTarget | null,
  destToken: BridgeToken | undefined,
): BridgeToken | undefined => {
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const accountAddress = selectAccountByScope(EVM_SCOPE)?.address;
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainRates = useSelector(selectMultichainAssetsRates);

  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  return useMemo((): BridgeToken | undefined => {
    if (!target || !destToken) return undefined;

    // `target.chain` is already a CAIP id (`positionToQuickBuyTarget` converts
    // the social feed's chain *name* into one). Running `chainNameToId` on it
    // again returns `undefined` for every real input, which silently disabled
    // the entire hook for production users.
    const caipChainId = target.chain as CaipChainId;

    const fiatCurrency = currentCurrency as Parameters<
      typeof addCurrencySymbol
    >[1];
    const zeroFiat = addCurrencySymbol('0.00', fiatCurrency);

    // ─── Non-EVM branch ─────────────────────────────────────────────────
    if (isNonEvmChainId(caipChainId)) {
      const nonEvmAccount = selectAccountByScope(caipChainId);
      if (!nonEvmAccount) return undefined;
      const balanceEntry =
        multichainBalances?.[nonEvmAccount.id]?.[destToken.address];
      const amountStr = balanceEntry?.amount;
      if (!amountStr) return undefined;
      const balanceNum = parseFloat(amountStr);
      if (isNaN(balanceNum) || balanceNum <= 0) return undefined;

      const rateStr = (
        multichainRates as Record<string, { rate?: string } | undefined>
      )?.[destToken.address]?.rate;
      const rateNum = rateStr ? parseFloat(rateStr) : NaN;
      const hasRate = !isNaN(rateNum) && rateNum > 0;

      const fiatValue = hasRate ? balanceNum * rateNum : 0;
      return {
        ...destToken,
        balance: amountStr,
        balanceFiat: hasRate
          ? addCurrencySymbol(fiatValue.toFixed(2), fiatCurrency)
          : zeroFiat,
        tokenFiatAmount: fiatValue,
        currencyExchangeRate: hasRate ? rateNum : undefined,
      };
    }

    // ─── EVM branch ────────────────────────────────────────────────────
    if (!accountAddress) return undefined;
    const hexChainId = formatChainIdToHex(caipChainId as CaipChainId) as Hex;

    let rawBalance: string | undefined;
    if (isNativeAddress(target.tokenAddress)) {
      rawBalance = getCachedNativeBalance(
        accountsByChainId,
        hexChainId,
        accountAddress,
      );
    } else {
      rawBalance = getCachedErc20Balance(
        tokenBalances,
        accountAddress,
        hexChainId,
        target.tokenAddress,
      );
    }

    if (!hasNonZeroHexBalance(rawBalance)) return undefined;

    let displayBalance: string;
    try {
      displayBalance = formatUnits(rawBalance, destToken.decimals);
    } catch {
      return undefined;
    }

    const balanceNum = parseFloat(displayBalance);
    if (isNaN(balanceNum) || balanceNum <= 0) return undefined;

    const networkConfig = allNetworkConfigs?.[hexChainId];
    const nativeTicker = networkConfig?.nativeCurrency;
    const nativeConversionRate = nativeTicker
      ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
      : 0;

    // Resolve the source token's price in user fiat. If anything's missing we
    // still return the token with its real balance — downstream flows will
    // operate on token amounts and render $0.00 for fiat, matching the
    // wallet-wide behaviour (see `calculateEvmBalances`).
    let exchangeRate: number | undefined;
    if (nativeConversionRate > 0) {
      if (isNativeAddress(target.tokenAddress)) {
        exchangeRate = nativeConversionRate;
      } else {
        const tokenPrice = getTokenPrice(
          tokenMarketData,
          hexChainId,
          target.tokenAddress,
        );
        if (tokenPrice !== undefined) {
          exchangeRate = tokenPrice * nativeConversionRate;
        }
      }
    }
    if (exchangeRate !== undefined && exchangeRate <= 0) {
      exchangeRate = undefined;
    }

    const fiatValue =
      exchangeRate !== undefined ? balanceNum * exchangeRate : 0;
    return {
      ...destToken,
      balance: displayBalance,
      balanceFiat:
        exchangeRate !== undefined
          ? addCurrencySymbol(fiatValue.toFixed(2), fiatCurrency)
          : zeroFiat,
      tokenFiatAmount: fiatValue,
      currencyExchangeRate: exchangeRate,
    };
  }, [
    target,
    destToken,
    accountAddress,
    selectAccountByScope,
    multichainBalances,
    multichainRates,
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    currentCurrency,
    allNetworkConfigs,
  ]);
};
