import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatUnits } from 'ethers/lib/utils';
import {
  isSolanaChainId,
  isNonEvmChainId,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
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
import { chainNameToId } from '../../../../utils/chainMapping';
import type { QuickBuyTarget } from '../types';
import {
  isNativeToken,
  hasNonZeroHexBalance,
  getCachedNativeBalance,
  getCachedErc20Balance,
  getTokenPrice,
} from './tokenBalanceUtils';

/**
 * Resolves the current user's balance of the position token (i.e. the token
 * that would be *sold* in Sell mode). Returns a `BridgeToken` enriched with
 * balance / fiatValue, or `undefined` when the balance is zero, the price is
 * unavailable, or data is still loading.
 *
 * Mirrors the per-token logic in `useSourceTokenOptions`.
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
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainRates = useSelector(selectMultichainAssetsRates);

  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  return useMemo((): BridgeToken | undefined => {
    if (!target || !destToken) return undefined;

    const caipChainId = chainNameToId(target.chain) as
      | CaipChainId
      | Hex
      | undefined;
    if (!caipChainId) return undefined;

    // ─── Solana branch ─────────────────────────────────────────────────
    if (isNonEvmChainId(caipChainId) && isSolanaChainId(caipChainId)) {
      if (!solanaAccount) return undefined;
      const balanceEntry =
        multichainBalances?.[solanaAccount.id]?.[destToken.address];
      const amountStr = balanceEntry?.amount;
      if (!amountStr) return undefined;
      const balanceNum = parseFloat(amountStr);
      if (isNaN(balanceNum) || balanceNum <= 0) return undefined;

      const rateStr = (
        multichainRates as Record<string, { rate?: string } | undefined>
      )?.[destToken.address]?.rate;
      const rateNum = rateStr ? parseFloat(rateStr) : NaN;
      if (isNaN(rateNum) || rateNum <= 0) return undefined;

      const fiatValue = balanceNum * rateNum;
      return {
        ...destToken,
        balance: amountStr,
        balanceFiat: addCurrencySymbol(
          fiatValue.toFixed(2),
          currentCurrency as Parameters<typeof addCurrencySymbol>[1],
        ),
        tokenFiatAmount: fiatValue,
        currencyExchangeRate: rateNum,
      };
    }

    // ─── EVM branch ────────────────────────────────────────────────────
    if (!accountAddress) return undefined;
    const hexChainId = formatChainIdToHex(caipChainId as CaipChainId) as Hex;

    let rawBalance: string | undefined;
    if (isNativeToken(target.tokenAddress)) {
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
    if (nativeConversionRate <= 0) return undefined;

    let exchangeRate: number;

    if (isNativeToken(target.tokenAddress)) {
      exchangeRate = nativeConversionRate;
    } else {
      const tokenPrice = getTokenPrice(
        tokenMarketData,
        hexChainId,
        target.tokenAddress,
      );
      // No price data for this token — skip rather than return a misleading value.
      if (tokenPrice === undefined) return undefined;
      exchangeRate = tokenPrice * nativeConversionRate;
    }

    if (exchangeRate <= 0) return undefined;

    const fiatValue = balanceNum * exchangeRate;
    return {
      ...destToken,
      balance: displayBalance,
      balanceFiat: addCurrencySymbol(
        fiatValue.toFixed(2),
        currentCurrency as Parameters<typeof addCurrencySymbol>[1],
      ),
      tokenFiatAmount: fiatValue,
      currencyExchangeRate: exchangeRate,
    };
  }, [
    target,
    destToken,
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
};
