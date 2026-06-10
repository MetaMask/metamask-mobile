import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import { DefaultSwapDestTokens } from '../../../../../../UI/Bridge/constants/default-swap-dest-tokens';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { getNativeSourceToken } from '../../../../../../UI/Bridge/utils/tokenUtils';
import { getTokenKey } from '../tokenKey';
import { enrichTokenBalance } from './enrichTokenBalance';
import { isStablecoinSymbol } from './stablecoins';
import { RECEIVE_STABLECOIN_CANDIDATES } from './receiveStablecoinCandidates';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

/**
 * Static EVM stablecoin candidates for the Sell "Receive" picker.
 *
 * `DefaultSwapDestTokens` carries a single stablecoin per chain (which sets the
 * per-chain default selection — e.g. mUSD on mainnet/Linea), so we keep those
 * as the leading entries and then append the canonical USDC/USDT set from
 * `RECEIVE_STABLECOIN_CANDIDATES`. The append guarantees both major stablecoins
 * show on every supported chain (previously USDT was missing on Optimism,
 * USDC on Polygon, etc.) without disturbing the existing default ordering.
 * Duplicates are removed by stable token identity (`address:chainId`).
 */
const STABLECOIN_CANDIDATES: BridgeToken[] = (() => {
  const primaries = Object.values(DefaultSwapDestTokens).filter(
    (token) =>
      isStablecoinSymbol(token.symbol) &&
      typeof token.chainId === 'string' &&
      token.chainId.startsWith('0x'),
  );
  const seen = new Set(primaries.map(getTokenKey));
  const extras = RECEIVE_STABLECOIN_CANDIDATES.filter(
    (token) => !seen.has(getTokenKey(token)),
  );
  return [...primaries, ...extras];
})();

/**
 * Native token candidates for the Sell "Receive" picker, one per chain already
 * covered by `STABLECOIN_CANDIDATES`. Built via `getNativeSourceToken` so each
 * native uses the bridge-expected address (zero address on EVM). Chains the
 * helper can't resolve are skipped. Together with the stablecoins, these are
 * the tokens a user can receive when selling a position.
 */
const NATIVE_CANDIDATES: BridgeToken[] = Array.from(
  new Set(STABLECOIN_CANDIDATES.map((token) => token.chainId)),
).reduce<BridgeToken[]>((acc, chainId) => {
  try {
    acc.push(getNativeSourceToken(chainId));
  } catch {
    // Skip chains whose native asset can't be resolved.
  }
  return acc;
}, []);

/**
 * Returns the "Receive" picker candidates (stablecoins + native tokens),
 * sorting any candidate on `preferredChainId` to the front so the position's
 * chain is offered first. Stablecoins precede natives within each chain group,
 * keeping a stablecoin as the default selection (index 0).
 */
const getReceiveTokenCandidates = (
  preferredChainId: string | undefined,
): BridgeToken[] => {
  const all = [...STABLECOIN_CANDIDATES, ...NATIVE_CANDIDATES];
  if (!preferredChainId) return all;
  return [
    ...all.filter((t) => t.chainId === preferredChainId),
    ...all.filter((t) => t.chainId !== preferredChainId),
  ];
};

/**
 * Returns the "Receive" token options for QuickBuy Sell mode: the curated
 * stablecoin set plus each chain's native token, which the user can receive
 * when selling a position.
 *
 * All candidates are returned regardless of balance (the user can receive into
 * a token they don't yet hold). Held tokens are enriched with balance + fiat;
 * unheld ones show "$0.00". Candidates on `preferredChainId` are sorted to the
 * top, stablecoins before natives.
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
