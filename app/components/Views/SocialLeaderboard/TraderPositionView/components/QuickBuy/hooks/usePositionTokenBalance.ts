import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatUnits } from 'ethers/lib/utils';
import {
  isNonEvmChainId,
  isNativeAddress,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { SolScope, TrxScope, BtcScope } from '@metamask/keyring-api';
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
import { enrichTokenBalance } from './enrichTokenBalance';
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
  const accountAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const solanaAccount = useSelector((state: RootState) =>
    selectSelectedInternalAccountByScope(state)(SolScope.Mainnet),
  );
  const tronAccount = useSelector((state: RootState) =>
    selectSelectedInternalAccountByScope(state)(TrxScope.Mainnet),
  );
  const bitcoinAccount = useSelector((state: RootState) =>
    selectSelectedInternalAccountByScope(state)(BtcScope.Mainnet),
  );
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

    // ─── Non-EVM branch (Solana, Tron, Bitcoin) ───────────────────────
    // `enrichTokenBalance` prices all non-EVM assets generically from the
    // chain-agnostic multichain balance/rate controllers, so it replaces the
    // bespoke per-chain handling here and keeps the EVM branch's
    // `formatChainIdToHex` (which throws for non-EVM CAIP ids) out of reach.
    //
    // Lenient mode (`includeZeroBalance`) so a held-but-unpriceable token
    // (real balance, no resolvable rate) stays sellable — matching the EVM
    // branch below and the wallet-wide `calculateEvmBalances` behaviour. The
    // lenient path also returns a zero-balance enrichment for tokens the user
    // doesn't hold, so we drop those (balance ≤ 0) to preserve the strict
    // "no balance → not sellable" contract. Unpriced holdings render `$0.00`
    // (via `zeroFiat`) rather than a dash, consistent with the EVM branch.
    if (isNonEvmChainId(caipChainId)) {
      const enrichment = enrichTokenBalance(
        destToken,
        {
          accountAddress,
          accountsByChainId,
          tokenBalances,
          tokenMarketData,
          currencyRates,
          allNetworkConfigs,
          fiatCurrency,
          solanaAccount: solanaAccount ?? undefined,
          tronAccount: tronAccount ?? undefined,
          bitcoinAccount: bitcoinAccount ?? undefined,
          multichainBalances,
          multichainRates: multichainRates as Record<
            string,
            { rate?: string } | undefined
          >,
        },
        { includeZeroBalance: true },
      );
      if (!enrichment || !(parseFloat(enrichment.balance) > 0)) {
        return undefined;
      }
      return {
        ...destToken,
        ...enrichment,
        balanceFiat: enrichment.balanceFiat ?? zeroFiat,
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
    solanaAccount,
    tronAccount,
    bitcoinAccount,
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
