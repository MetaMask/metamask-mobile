import {
  getCapabilities,
  type EIP5792Messenger,
} from '@metamask/eip-5792-middleware';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getPermittedEthChainIds,
  type Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { ALLOWED_BRIDGE_CHAIN_IDS } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../Engine';
import { store } from '../../store';
import { selectSmartTransactionsEnabled } from '../../selectors/smartTransactionsController';
import { isRelaySupported } from '../../util/transactions/transaction-relay';

type SessionCapabilities = Awaited<ReturnType<typeof getCapabilities>>;

// In-memory session-capabilities cache: stale-while-revalidate + in-flight
// deduplication. Computation fans out per-chain RPC calls, which can make
// `wallet_getSession` too slow for the multichain-api-client SDK's short
// session-restore timeout on dapp page load. Only the very first computation
// for a key (account + chains; entries are origin-independent) ever blocks:
// stale entries are served immediately and refreshed in the background.
const CACHE_FRESH_MS = 300_000; // background-refresh cadence: 5 minutes

const sessionCapabilitiesCache = new Map<
  string,
  {
    value?: SessionCapabilities;
    timestamp: number;
    pending?: Promise<SessionCapabilities>;
  }
>();

// Clears the session capabilities cache. Exported for testing purposes only.
export function clearSessionCapabilitiesCache(): void {
  sessionCapabilitiesCache.clear();
}

// Order/case-insensitive; `undefined`/empty chainIds = all configured chains.
function buildCacheKey(address: string, chainIds?: Hex[]): string {
  const chainsKey = chainIds?.length
    ? [...chainIds].sort((a, b) => a.localeCompare(b)).join(',')
    : '*';
  return `${address.toLowerCase()}:${chainsKey}`;
}

// Computes capabilities and stores them under `key`. Failures are never
// cached and never evict a previously cached (servable) value.
async function computeAndCache(
  key: string,
  address: string,
  chainIds?: Hex[],
): Promise<SessionCapabilities> {
  try {
    const value = await getCapabilities(
      buildGetCapabilitiesHooks(address as Hex),
      Engine.controllerMessenger as unknown as EIP5792Messenger,
      address as Hex,
      chainIds,
    );
    sessionCapabilitiesCache.set(key, { value, timestamp: Date.now() });
    return value;
  } catch (error) {
    const entry = sessionCapabilitiesCache.get(key);
    if (entry?.value) {
      entry.pending = undefined;
    } else {
      sessionCapabilitiesCache.delete(key);
    }
    throw error;
  }
}

/**
 * Builds the hooks object consumed by `@metamask/eip-5792-middleware`'s
 * `getCapabilities`. Shared between the EIP-5792 RPC middleware and the
 * multichain session `getCapabilities` hook so both compute capabilities
 * identically.
 *
 * @param targetAddress - The address capabilities are being computed for.
 * `getSendBundleSupportedChains` receives only chain IDs from the middleware,
 * so the address must be threaded in here; when omitted (the EIP-1193
 * middleware call site, which cannot know the per-request address at hook
 * build time), it falls back to the selected account — the historical
 * behavior.
 * @returns The getCapabilities hooks.
 */
export function buildGetCapabilitiesHooks(targetAddress?: Hex) {
  return {
    getDismissSmartAccountSuggestionEnabled: () =>
      Engine.context.PreferencesController.state
        .dismissSmartAccountSuggestionEnabled,
    getIsSmartTransaction: (chainId: Hex) =>
      selectSmartTransactionsEnabled(store.getState(), chainId),
    isAtomicBatchSupported:
      Engine.context.TransactionController.isAtomicBatchSupported.bind(
        Engine.context.TransactionController,
      ),
    isRelaySupported,
    getSendBundleSupportedChains: async (chainIds: Hex[]) => {
      const address =
        targetAddress ??
        (Engine.context.AccountsController.getSelectedAccount().address as Hex);
      const isAtomicBatchSupportedResult =
        await Engine.context.TransactionController.isAtomicBatchSupported({
          address,
          chainIds,
        });
      return isAtomicBatchSupportedResult.reduce(
        (acc: Record<Hex, boolean>, { chainId, isSupported }) => ({
          ...acc,
          [chainId]: isSupported,
        }),
        {},
      );
    },
    isAuxiliaryFundsSupported: (chainId: Hex) =>
      (ALLOWED_BRIDGE_CHAIN_IDS as readonly Hex[]).includes(chainId),
  };
}

/**
 * Computes EIP-5792 capabilities for a single address. Matches the multichain
 * session `getCapabilities` hook signature so it can hydrate
 * `sessionProperties.eip155Capabilities` on `wallet_createSession`,
 * `wallet_getSession`, and `wallet_sessionChanged`.
 *
 * @param address - The EVM address to compute capabilities for.
 * @param chainIds - Chains to compute capabilities for; `undefined` (or empty)
 * means all configured chains. Session hydration passes the session's
 * permitted eip155 chains so we neither fan out RPC calls to, nor disclose,
 * networks the dapp was not granted. Intentional divergence: a direct
 * `wallet_getCapabilities` answered by the wallet still covers all configured
 * chains. Stale cached results are served while refreshed in the background.
 * @returns Per-chain capabilities keyed by chain ID.
 */
export function getSessionCapabilities(
  address: string,
  chainIds?: Hex[],
): Promise<SessionCapabilities> {
  const key = buildCacheKey(address, chainIds);
  const entry = sessionCapabilitiesCache.get(key);

  if (entry?.value) {
    if (Date.now() - entry.timestamp >= CACHE_FRESH_MS && !entry.pending) {
      // Stale: serve the cached value now, refresh in the background.
      entry.pending = computeAndCache(key, address, chainIds);
      entry.pending.catch(() => undefined);
    }
    return Promise.resolve(entry.value);
  }

  if (entry?.pending) {
    return entry.pending;
  }

  const pending = computeAndCache(key, address, chainIds);
  sessionCapabilitiesCache.set(key, { timestamp: 0, pending });
  return pending;
}

/**
 * Resolves the eip155 chain IDs permitted by an origin's CAIP-25 caveat, for
 * scoping session capability hydration. Must be called at hook-call time (not
 * at middleware build time): `wallet_createSession` grants the permission
 * before hydrating session properties, so the fresh caveat is visible here.
 *
 * @param origin - The origin (or channelId / snapId) holding the permission.
 * @returns The permitted chain IDs, or `undefined` (= all configured chains,
 * the pre-scoping behavior) when the caveat is missing or the lookup fails.
 */
export function getPermittedEip155ChainIds(origin: string): Hex[] | undefined {
  try {
    const caveat = Engine.context.PermissionController.getCaveat(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
    );
    if (!caveat) {
      return undefined;
    }
    return getPermittedEthChainIds(caveat.value as Caip25CaveatValue);
  } catch {
    return undefined;
  }
}
