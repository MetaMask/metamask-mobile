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

// In-memory session-capabilities cache (TTL + in-flight deduplication,
// mirroring `app/util/transactions/sentinel-api.ts`). Computation fans out
// per-chain RPC calls, which can make `wallet_getSession` too slow for the
// multichain-api-client SDK's short session-restore timeout on dapp page
// load; `wallet_createSession` seeds the cache at connect time so the
// post-reload `wallet_getSession` is a hit. Capabilities depend only on
// account and chains (never the origin), so entries are shared across dapps.
const CACHE_TTL_MS = 300_000; // 5 minutes

interface SessionCapabilitiesCacheEntry {
  value?: SessionCapabilities;
  timestamp: number;
  pending?: Promise<SessionCapabilities>;
}

const sessionCapabilitiesCache = new Map<
  string,
  SessionCapabilitiesCacheEntry
>();

// Clears the session capabilities cache. Exported for testing purposes only.
export function clearSessionCapabilitiesCache(): void {
  sessionCapabilitiesCache.clear();
}

// Order- and case-insensitive; `undefined`/empty chainIds = all configured
// chains.
function buildCacheKey(address: string, chainIds?: Hex[]): string {
  const chainsKey = chainIds?.length
    ? [...chainIds].sort((a, b) => a.localeCompare(b)).join(',')
    : '*';
  return `${address.toLowerCase()}:${chainsKey}`;
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
 * chains. Results are cached (see `CACHE_TTL_MS`); failures are never cached.
 * @returns Per-chain capabilities keyed by chain ID.
 */
export function getSessionCapabilities(
  address: string,
  chainIds?: Hex[],
): Promise<SessionCapabilities> {
  const key = buildCacheKey(address, chainIds);
  const entry = sessionCapabilitiesCache.get(key);

  if (entry?.value && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(entry.value);
  }

  if (entry?.pending) {
    return entry.pending;
  }

  const pending = Promise.resolve(
    getCapabilities(
      buildGetCapabilitiesHooks(address as Hex),
      Engine.controllerMessenger as unknown as EIP5792Messenger,
      address as Hex,
      chainIds,
    ),
  ).then(
    (value) => {
      sessionCapabilitiesCache.set(key, { value, timestamp: Date.now() });
      return value;
    },
    (error) => {
      sessionCapabilitiesCache.delete(key);
      throw error;
    },
  );

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
