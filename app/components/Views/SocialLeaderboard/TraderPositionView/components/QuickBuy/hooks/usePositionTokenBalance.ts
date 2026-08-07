import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatUnits } from 'ethers/lib/utils';
import {
  isNonEvmChainId,
  isNativeAddress,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { SolScope, TrxScope, BtcScope, XlmScope } from '@metamask/keyring-api';
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
import { safeToChecksumAddress } from '../../../../../../../util/address';
import { formatCurrency } from '../../../../../../UI/Bridge/utils/currencyUtils';
import { calcTokenFiatRate } from '../../../../../../UI/Bridge/utils/exchange-rates';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import type { QuickBuyTarget } from '../types';
import { enrichTokenBalance } from './enrichTokenBalance';
import {
  hasNonZeroHexBalance,
  getCachedNativeBalance,
  getCachedErc20Balance,
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
 * a zero fiat value in the user's display currency and an undefined
 * `currencyExchangeRate`), so downstream flows can let the user act on the
 * token amount instead of hiding it entirely. `currencyExchangeRate` is a
 * user-currency-per-token rate (consistent across EVM and non-EVM).
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
  const stellarAccount = useSelector((state: RootState) =>
    selectSelectedInternalAccountByScope(state)(XlmScope.Pubnet),
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

    const zeroFiat = formatCurrency(0, currentCurrency);

    // `calcTokenFiatRate` looks up `tokenMarketData` by the raw `token.address`
    // (keyed by checksummed addresses).
    const pricedDestToken =
      isNonEvmChainId(destToken.chainId) || isNativeAddress(destToken.address)
        ? destToken
        : {
            ...destToken,
            address:
              safeToChecksumAddress(destToken.address) ?? destToken.address,
          };

    // The fiat rate is delegated to the canonical `calcTokenFiatRate`, so the
    // position token shares the wallet-wide user-currency exchange-rate
    // semantics (EVM native/ERC-20 and non-EVM are all handled there). It
    // returns a user-currency-per-token rate, or `undefined` when no price is
    // resolvable — in which case we still surface the held balance with a zero
    // fiat value, matching the wallet-wide behaviour (see `calculateEvmBalances`).
    const exchangeRate = calcTokenFiatRate({
      token: pricedDestToken,
      evmMultiChainMarketData: tokenMarketData,
      networkConfigurationsByChainId: (allNetworkConfigs ?? {}) as Record<
        Hex,
        { nativeCurrency: string }
      >,
      evmMultiChainCurrencyRates: currencyRates,
      nonEvmMultichainAssetRates: multichainRates as Parameters<
        typeof calcTokenFiatRate
      >[0]['nonEvmMultichainAssetRates'],
    });
    const hasRate = exchangeRate !== undefined && exchangeRate > 0;

    const buildResult = (
      balanceStr: string,
      balanceNum: number,
    ): BridgeToken => {
      const fiatValue = hasRate ? balanceNum * (exchangeRate as number) : 0;
      return {
        ...destToken,
        balance: balanceStr,
        balanceFiat: hasRate
          ? formatCurrency(fiatValue, currentCurrency)
          : zeroFiat,
        tokenFiatAmount: fiatValue,
        currencyExchangeRate: hasRate ? exchangeRate : undefined,
      };
    };

    // ─── Non-EVM branch (Solana, Tron, Bitcoin) ───────────────────────
    // `enrichTokenBalance` prices all non-EVM assets generically from the
    // chain-agnostic multichain balance/rate controllers, so it replaces the
    // bespoke per-chain handling here and keeps the EVM branch's
    // `formatChainIdToHex` (which throws for non-EVM CAIP ids) out of reach.
    // It prices via the canonical `calcTokenFiatRate` in the user's display
    // currency (`currentCurrency`), so Tron/Bitcoin positions are sellable and
    // shown in the same currency as the EVM branch.
    //
    // Lenient mode (`includeZeroBalance`) so a held-but-unpriceable token
    // (real balance, no resolvable rate) stays sellable — matching the EVM
    // branch below and the wallet-wide `calculateEvmBalances` behaviour. The
    // lenient path also returns a zero-balance enrichment for tokens the user
    // doesn't hold, so we drop those (balance ≤ 0) to preserve the strict
    // "no balance → not sellable" contract. Unpriced holdings render the
    // user-currency zero (via `zeroFiat`) rather than a dash, consistent with
    // the EVM branch.
    if (isNonEvmChainId(caipChainId)) {
      const enrichment = enrichTokenBalance(
        destToken,
        {
          accountAddress,
          accountsByChainId,
          tokenBalances,
          tokenMarketData,
          currencyRates,
          currentCurrency,
          allNetworkConfigs,
          solanaAccount: solanaAccount ?? undefined,
          tronAccount: tronAccount ?? undefined,
          stellarAccount: stellarAccount ?? undefined,
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

    return buildResult(displayBalance, balanceNum);
  }, [
    target,
    destToken,
    accountAddress,
    solanaAccount,
    tronAccount,
    stellarAccount,
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
