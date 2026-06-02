import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
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
import { addCurrencySymbol } from '../../../../../../../util/number/bigint';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../../../../../../../selectors/multichain/multichain';
import {
  getSourceTokenCandidates,
  getSellDestTokenCandidates,
} from '../sourceTokenCandidates';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import {
  isNativeToken,
  hasNonZeroHexBalance,
  getCachedNativeBalance,
  getCachedErc20Balance,
  getTokenPrice,
} from './tokenBalanceUtils';

/**
 * Returns the list of source token options for QuickBuy,
 * filtered to only tokens where the user has a non-zero balance.
 *
 * Reads cached balances from Redux only:
 * - native balances from AccountTrackerController
 * - ERC-20 balances from TokenBalancesController
 */
export const useSourceTokenOptions = (
  destChainId: Hex | CaipChainId | undefined,
): { options: BridgeToken[]; isLoading: boolean } => {
  const candidates = useMemo(
    () => getSourceTokenCandidates(destChainId),
    [destChainId],
  );

  const accountAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Solana support — keep the whole InternalAccount; multichain balances are
  // keyed by account.id, not address.
  const solanaAccount = useSelector((state: RootState) =>
    selectSelectedInternalAccountByScope(state)(SolScope.Mainnet),
  );
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainRates = useSelector(selectMultichainAssetsRates);

  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  // Build the final options list from Redux balances
  const options = useMemo(() => {
    if (!accountAddress && !solanaAccount) return [];

    const result: BridgeToken[] = [];

    for (const candidate of candidates) {
      // ─── Solana branch ─────────────────────────────────────────────
      // Multichain balances are keyed by InternalAccount.id and assetId
      // (CAIP, e.g. `solana:5eykt.../slip44:501`). The rate is already in
      // USD, no native-currency conversion step.
      if (isSolanaChainId(candidate.chainId)) {
        if (!solanaAccount) continue;

        const balanceEntry =
          multichainBalances?.[solanaAccount.id]?.[candidate.address];
        const amountStr = balanceEntry?.amount;
        if (!amountStr) continue;

        const balanceNum = parseFloat(amountStr);
        if (isNaN(balanceNum) || balanceNum <= 0) continue;

        const rateStr = (
          multichainRates as Record<string, { rate?: string } | undefined>
        )?.[candidate.address]?.rate;
        const rateNum = rateStr ? parseFloat(rateStr) : NaN;
        if (isNaN(rateNum) || rateNum <= 0) continue;

        const fiatValue = balanceNum * rateNum;
        result.push({
          ...candidate,
          balance: amountStr,
          balanceFiat: addCurrencySymbol(
            fiatValue.toFixed(2),
            currentCurrency as Parameters<typeof addCurrencySymbol>[1],
          ),
          tokenFiatAmount: fiatValue,
          currencyExchangeRate: rateNum,
        });
        continue;
      }

      // ─── EVM branch ────────────────────────────────────────────────
      if (!accountAddress) continue;

      const chainId = candidate.chainId as Hex;
      let rawBalance: string | undefined;
      let displayBalance: string | undefined;

      if (isNativeToken(candidate.address)) {
        rawBalance = getCachedNativeBalance(
          accountsByChainId,
          chainId,
          accountAddress,
        );
      } else {
        rawBalance = getCachedErc20Balance(
          tokenBalances,
          accountAddress,
          chainId,
          candidate.address,
        );
      }

      if (!hasNonZeroHexBalance(rawBalance)) {
        continue;
      }

      try {
        displayBalance = formatUnits(rawBalance, candidate.decimals);
      } catch {
        continue;
      }

      const balanceNum = parseFloat(displayBalance);
      if (isNaN(balanceNum) || balanceNum <= 0) continue;

      // Compute fiat value and exchange rate
      const networkConfig = allNetworkConfigs?.[chainId];
      const nativeTicker = networkConfig?.nativeCurrency;
      const nativeConversionRate = nativeTicker
        ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
        : 0;

      let exchangeRate: number;
      let fiatValue: number;

      if (isNativeToken(candidate.address)) {
        exchangeRate = nativeConversionRate;
        if (exchangeRate <= 0) {
          continue;
        }

        fiatValue = balanceNum * exchangeRate;
      } else {
        const tokenPrice = getTokenPrice(
          tokenMarketData,
          chainId,
          candidate.address,
        );

        if (tokenPrice !== undefined) {
          if (nativeConversionRate <= 0) {
            continue;
          }

          exchangeRate = tokenPrice * nativeConversionRate;
        } else {
          // Fallback for stablecoins: assume ~$1.00 when token price is unavailable.
          exchangeRate = 1.0;
        }

        if (exchangeRate <= 0) {
          continue;
        }

        fiatValue = balanceNum * exchangeRate;
      }

      result.push({
        ...candidate,
        balance: displayBalance,
        balanceFiat: addCurrencySymbol(
          fiatValue.toFixed(2),
          currentCurrency as Parameters<typeof addCurrencySymbol>[1],
        ),
        tokenFiatAmount: fiatValue,
        currencyExchangeRate: exchangeRate ?? undefined,
      });
    }

    result.sort((a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0));
    return result;
  }, [
    candidates,
    accountAddress,
    solanaAccount,
    multichainBalances,
    multichainRates,
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    currentCurrency,
    allNetworkConfigs,
  ]);

  return { options, isLoading: false };
};

/**
 * Returns the list of stable token options for the Sell "Receive with" picker.
 * All stable candidates are returned regardless of user balance (the user can
 * receive into any stable, including ones they don't yet hold).
 * Tokens the user holds are enriched with balance + fiat data so the row can
 * display them; tokens they don't hold show "—" in the row.
 * Stables on the `preferredChainId` are sorted to the top.
 */
export const useSellDestTokenOptions = (
  preferredChainId: string | undefined,
): BridgeToken[] => {
  const candidates = useMemo(
    () => getSellDestTokenCandidates(preferredChainId),
    [preferredChainId],
  );

  const accountAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  return useMemo(
    () =>
      candidates.map((candidate) => {
        // Stables are EVM-only in STABLECOIN_CANDIDATES, so skip Solana branch.
        if (!accountAddress) {
          return {
            ...candidate,
            balance: '0',
            balanceFiat: addCurrencySymbol(
              '0.00',
              currentCurrency as Parameters<typeof addCurrencySymbol>[1],
            ),
            tokenFiatAmount: 0,
            currencyExchangeRate: 1.0,
          };
        }

        const chainId = candidate.chainId as Hex;
        const rawBalance = getCachedErc20Balance(
          tokenBalances,
          accountAddress,
          chainId,
          candidate.address,
        );

        if (!hasNonZeroHexBalance(rawBalance)) {
          // Show $0.00 for stables the user doesn't hold — we know their price.
          return {
            ...candidate,
            balance: '0',
            balanceFiat: addCurrencySymbol(
              '0.00',
              currentCurrency as Parameters<typeof addCurrencySymbol>[1],
            ),
            tokenFiatAmount: 0,
            currencyExchangeRate: 1.0,
          };
        }

        let displayBalance: string;
        try {
          displayBalance = formatUnits(rawBalance, candidate.decimals);
        } catch {
          return {
            ...candidate,
            balance: '0',
            balanceFiat: addCurrencySymbol(
              '0.00',
              currentCurrency as Parameters<typeof addCurrencySymbol>[1],
            ),
            tokenFiatAmount: 0,
            currencyExchangeRate: 1.0,
          };
        }

        const balanceNum = parseFloat(displayBalance);
        if (isNaN(balanceNum) || balanceNum <= 0) {
          return {
            ...candidate,
            balance: '0',
            balanceFiat: addCurrencySymbol(
              '0.00',
              currentCurrency as Parameters<typeof addCurrencySymbol>[1],
            ),
            tokenFiatAmount: 0,
            currencyExchangeRate: 1.0,
          };
        }

        const networkConfig = allNetworkConfigs?.[chainId];
        const nativeTicker = networkConfig?.nativeCurrency;
        const nativeConversionRate = nativeTicker
          ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
          : 0;

        const tokenPrice =
          tokenMarketData?.[chainId as `0x${string}`]?.[
            candidate.address.toLowerCase() as `0x${string}`
          ]?.price ??
          tokenMarketData?.[chainId as `0x${string}`]?.[
            candidate.address as `0x${string}`
          ]?.price;

        let exchangeRate: number;
        if (tokenPrice !== undefined && nativeConversionRate > 0) {
          exchangeRate = tokenPrice * nativeConversionRate;
        } else {
          // Stablecoins: fall back to $1.00 when price data is unavailable.
          exchangeRate = 1.0;
        }

        const fiatValue = balanceNum * exchangeRate;

        return {
          ...candidate,
          balance: displayBalance,
          balanceFiat: addCurrencySymbol(
            fiatValue.toFixed(2),
            currentCurrency as Parameters<typeof addCurrencySymbol>[1],
          ),
          tokenFiatAmount: fiatValue,
          currencyExchangeRate: exchangeRate,
        };
      }),
    [
      candidates,
      accountAddress,
      tokenBalances,
      tokenMarketData,
      currencyRates,
      currentCurrency,
      allNetworkConfigs,
    ],
  );
};
