import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isNonEvmChainId, isSolanaChainId } from '@metamask/bridge-controller';
import { BtcScope, SolScope, TrxScope, XlmScope } from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
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
import { getAllChainDefaultDestTokens } from '../../../../../../UI/Bridge/utils/getAllChainDefaultDestTokens';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { getNativeSourceToken } from '../../../../../../UI/Bridge/utils/tokenUtils';
import { getTokenKey } from '../tokenKey';
import { enrichTokenBalance } from './enrichTokenBalance';
import { isStablecoinSymbol } from './stablecoins';
import { RECEIVE_STABLECOIN_CANDIDATES } from './receiveStablecoinCandidates';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

/**
 * Static stablecoin candidates for the Sell "Receive" picker (EVM, Solana,
 * Tron).
 *
 * `DefaultSwapDestTokens` carries a single stablecoin per chain (which sets the
 * per-chain default selection — e.g. mUSD on mainnet/Linea, USDC on Solana,
 * USDT on Tron), so we keep those as the leading entries and then append the
 * canonical USDC/USDT set from `RECEIVE_STABLECOIN_CANDIDATES`. The append
 * guarantees both major stablecoins show on every supported EVM chain
 * (previously USDT was missing on Optimism, USDC on Polygon, etc.) without
 * disturbing the existing default ordering. Duplicates are removed by stable
 * token identity (`address:chainId`).
 *
 * Stablecoin candidates are limited to the chains whose token addresses
 * QuickBuy can actually resolve and quote as destinations: EVM (hex chain ids),
 * Solana, and Tron. Their destination addresses come straight from the static
 * `DefaultSwapDestTokens` map (CAIP-encoded for non-EVM) and flow into the
 * bridge quote request unchanged — no `useAssetMetadata` lookup is involved on
 * the receive path. Other non-EVM chains without a curated stablecoin (e.g.
 * Bitcoin) are offered as native-only via `NATIVE_ONLY_NON_EVM_CHAINS` instead.
 */
const STABLECOIN_CANDIDATES: BridgeToken[] = (() => {
  const primaries = getAllChainDefaultDestTokens().filter(
    (token) =>
      isStablecoinSymbol(token.symbol) &&
      typeof token.chainId === 'string' &&
      (token.chainId.startsWith('0x') ||
        isSolanaChainId(token.chainId) ||
        token.chainId === TrxScope.Mainnet ||
        token.chainId === XlmScope.Pubnet),
  );
  const seen = new Set(primaries.map(getTokenKey));
  const extras = RECEIVE_STABLECOIN_CANDIDATES.filter(
    (token) => !seen.has(getTokenKey(token)),
  );
  return [...primaries, ...extras];
})();

/**
 * Non-EVM chains offered as native-asset-only receive candidates (BTC). Their
 * native assets resolve through the bridge native-asset registry
 * (`getNativeSourceToken`). Bitcoin has no curated stablecoin destination, so
 * only its native asset is offered. (Tron is no longer native-only: its USDT
 * destination is admitted via `STABLECOIN_CANDIDATES`, and native TRX is still
 * generated because Tron's chain id appears among the stablecoin chains below.)
 */
const NATIVE_ONLY_NON_EVM_CHAINS: CaipChainId[] = [BtcScope.Mainnet];

/**
 * Native token candidates for the Sell "Receive" picker: one per chain already
 * covered by `STABLECOIN_CANDIDATES`, plus the native-only non-EVM chains
 * (TRX, BTC). Built via `getNativeSourceToken` so each native uses the
 * bridge-expected address (zero address on EVM, CAIP asset id on non-EVM).
 * Chains the helper can't resolve are skipped. Together with the stablecoins,
 * these are the tokens a user can receive when selling a position.
 */
const NATIVE_CANDIDATES: BridgeToken[] = Array.from(
  new Set<BridgeToken['chainId']>([
    ...STABLECOIN_CANDIDATES.map((token) => token.chainId),
    ...NATIVE_ONLY_NON_EVM_CHAINS,
  ]),
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
 *
 * Non-EVM candidates (Solana, Tron, Bitcoin) are only offered when the
 * selected account actually has an address on that chain (multichain account
 * groups may lack one), mirroring how the rest of the app gates non-EVM
 * visibility via `selectSelectedInternalAccountByScope(scope)`.
 */
export const useReceiveTokens = (
  preferredChainId: string | undefined,
): BridgeToken[] => {
  const isChainEnabled = useNetworkEnabledPredicate();

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const solanaAccount = selectAccountByScope(SolScope.Mainnet);
  const tronAccount = selectAccountByScope(TrxScope.Mainnet);
  const stellarAccount = selectAccountByScope(XlmScope.Pubnet);
  const bitcoinAccount = selectAccountByScope(BtcScope.Mainnet);

  // Non-EVM accounts in the selected group, keyed by the CAIP chain id the
  // receive candidates carry. A missing entry means the user has no address on
  // that chain and cannot receive there.
  const nonEvmAccountByChainId = useMemo(
    () => ({
      [SolScope.Mainnet]: solanaAccount,
      [TrxScope.Mainnet]: tronAccount,
      [XlmScope.Pubnet]: stellarAccount,
      [BtcScope.Mainnet]: bitcoinAccount,
    }),
    [solanaAccount, tronAccount, stellarAccount, bitcoinAccount],
  );

  const candidates = useMemo(
    () =>
      getReceiveTokenCandidates(preferredChainId).filter((candidate) => {
        if (!isChainEnabled(candidate.chainId)) return false;
        if (!isNonEvmChainId(candidate.chainId)) return true;
        // Without an address on the non-EVM chain the user cannot receive there.
        return Boolean(
          nonEvmAccountByChainId[
            candidate.chainId as keyof typeof nonEvmAccountByChainId
          ],
        );
      }),
    [preferredChainId, isChainEnabled, nonEvmAccountByChainId],
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
      currentCurrency,
      allNetworkConfigs,
      solanaAccount,
      tronAccount,
      stellarAccount,
      bitcoinAccount,
      multichainBalances,
      multichainRates,
    ],
  );
};
