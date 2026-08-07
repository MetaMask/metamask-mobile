import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SolScope, TrxScope, BtcScope, XlmScope } from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../../reducers';
import { useTokensWithBalance } from '../../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { selectSelectedSourceChainIds } from '../../../../../../../core/redux/slices/bridge';
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
  selectMultichainAssetsAllIgnoredAssets,
} from '../../../../../../../selectors/multichain/multichain';
import { getTokensControllerAllIgnoredTokens } from '../../../../../../../selectors/assets/assets-migration';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { enrichTokenBalance } from './enrichTokenBalance';
import { isPayWithTokenHidden } from './isPayWithTokenHidden';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

/**
 * Returns the "Pay with" token options for QuickBuy Buy mode: every tradable
 * token the user actually holds across the bridge-enabled source chains (EVM +
 * Solana), priced in USD.
 *
 * The held-token list comes from the same `useTokensWithBalance` source the
 * Bridge/Swap pickers use, so arbitrary holdings (CAKE, UP, dogwifhat, …) are
 * eligible — not just a curated stablecoin/native allowlist. Each token is then
 * re-priced through `enrichTokenBalance` to attach the USD `currencyExchangeRate`
 * the controller relies on, and unpriceable holdings are filtered out.
 */
export const usePayWithTokens = (): {
  options: BridgeToken[];
  isLoading: boolean;
} => {
  const sourceChainIds = useSelector(selectSelectedSourceChainIds);
  const heldTokens = useTokensWithBalance({ chainIds: sourceChainIds });
  const isChainEnabled = useNetworkEnabledPredicate();

  const accountByScope = useSelector(selectSelectedInternalAccountByScope);
  const accountAddress = accountByScope(EVM_SCOPE)?.address;
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const solanaAccount = accountByScope(SolScope.Mainnet);
  const tronAccount = accountByScope(TrxScope.Mainnet);
  const stellarAccount = accountByScope(XlmScope.Pubnet);
  const bitcoinAccount = accountByScope(BtcScope.Mainnet);
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainRates = useSelector(selectMultichainAssetsRates);

  // Hidden-token state from the same consolidated selectors the main wallet
  // list uses, so tokens hidden via "long tap -> hide" are excluded here too.
  const ignoredEvmTokens = useSelector(getTokensControllerAllIgnoredTokens);
  const ignoredNonEvmAssets = useSelector(
    selectMultichainAssetsAllIgnoredAssets,
  );

  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  const options = useMemo(() => {
    const deps = {
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
    };

    const result: BridgeToken[] = [];
    for (const token of heldTokens) {
      // Scope holdings to networks the user has enabled in wallet settings.
      if (!isChainEnabled(token.chainId)) continue;
      // Exclude tokens the user has hidden (TSA-649).
      if (
        isPayWithTokenHidden(token, {
          ignoredEvmTokens,
          ignoredNonEvmAssets,
          evmAccountAddress: accountAddress,
          resolveNonEvmAccountId: (chainId: CaipChainId) =>
            accountByScope(chainId)?.id,
        })
      )
        continue;
      const enrichment = enrichTokenBalance(token, deps);
      if (!enrichment) continue;
      result.push({ ...token, ...enrichment });
    }

    result.sort((a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0));
    return result;
  }, [
    heldTokens,
    isChainEnabled,
    accountByScope,
    accountAddress,
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    currentCurrency,
    allNetworkConfigs,
    solanaAccount,
    tronAccount,
    stellarAccount,
    bitcoinAccount,
    multichainBalances,
    multichainRates,
    ignoredEvmTokens,
    ignoredNonEvmAssets,
  ]);

  return { options, isLoading: false };
};
