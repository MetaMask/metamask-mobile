import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import {
  DefaultSwapDestTokens,
  Bip44TokensForDefaultPairs,
} from '../../../../../../UI/Bridge/constants/default-swap-dest-tokens';
import { ETH_USDT_ADDRESS } from '../../../../../../../constants/bridge';
import { NETWORK_CHAIN_ID } from '../../../../../../../util/networks/customNetworks';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { enrichTokenBalance } from './enrichTokenBalance';
import { isStablecoinSymbol } from './stablecoins';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

/** Stablecoins are assumed to be ~$1.00 when no market price is available. */
const STABLECOIN_FALLBACK_RATE = 1.0;

/**
 * Static EVM stablecoin candidates for the Sell "Receive" picker, extracted
 * from `DefaultSwapDestTokens` and filtered to mUSD, USDC, and USDT on EVM
 * chains. These are the only tokens a user can receive when selling a position.
 */
const STABLECOIN_CANDIDATES: BridgeToken[] = Object.values(
  DefaultSwapDestTokens,
)
  .filter(
    (token) =>
      isStablecoinSymbol(token.symbol) &&
      typeof token.chainId === 'string' &&
      token.chainId.startsWith('0x'),
  )
  // Add mainnet USDC from Bip44TokensForDefaultPairs (DefaultSwapDestTokens has mUSD for mainnet)
  .concat(
    Bip44TokensForDefaultPairs[
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    ],
  )
  // Add mainnet USDT (not in DefaultSwapDestTokens)
  .concat({
    symbol: 'USDT',
    name: 'Tether USD',
    address: ETH_USDT_ADDRESS,
    decimals: 6,
    image:
      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    chainId: NETWORK_CHAIN_ID.MAINNET,
  });

/**
 * Returns the stablecoin candidates for the "Receive" picker, sorting any
 * candidate on `preferredChainId` to the front so the position's chain is
 * offered first.
 */
const getReceiveTokenCandidates = (
  preferredChainId: string | undefined,
): BridgeToken[] => {
  const all = [...STABLECOIN_CANDIDATES];
  if (!preferredChainId) return all;
  return [
    ...all.filter((t) => t.chainId === preferredChainId),
    ...all.filter((t) => t.chainId !== preferredChainId),
  ];
};

/**
 * Returns the "Receive" token options for QuickBuy Sell mode: the curated
 * stablecoin set the user can receive when selling a position.
 *
 * All stable candidates are returned regardless of balance (the user can
 * receive into a stable they don't yet hold). Held stables are enriched with
 * balance + fiat; unheld ones show "$0.00". Stables on `preferredChainId` are
 * sorted to the top.
 */
export const useReceiveTokens = (
  preferredChainId: string | undefined,
): BridgeToken[] => {
  const isChainEnabled = useNetworkEnabledPredicate();
  const candidates = useMemo(
    () =>
      getReceiveTokenCandidates(preferredChainId).filter((candidate) =>
        isChainEnabled(candidate.chainId),
      ),
    [preferredChainId, isChainEnabled],
  );

  const accountAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  return useMemo(
    () =>
      candidates.map((candidate) => {
        const enrichment = enrichTokenBalance(
          candidate,
          {
            accountAddress,
            accountsByChainId,
            tokenBalances,
            tokenMarketData,
            currencyRates,
            allNetworkConfigs,
          },
          {
            fallbackExchangeRate: STABLECOIN_FALLBACK_RATE,
            includeZeroBalance: true,
          },
        );
        return { ...candidate, ...enrichment };
      }),
    [
      candidates,
      accountAddress,
      accountsByChainId,
      tokenBalances,
      tokenMarketData,
      currencyRates,
      allNetworkConfigs,
    ],
  );
};
