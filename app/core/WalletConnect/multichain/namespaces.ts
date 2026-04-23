import { KnownCaipNamespace } from '@metamask/utils';

import { getAdapter, getAllAdapters } from './registry';
import type { NamespaceConfig, ProposalLike } from './types';

const WALLET_PREFIX = `${KnownCaipNamespace.Wallet}:` as const;

export type ApprovedNamespaces = Record<string, NamespaceConfig>;

/**
 * Map a scope key or chain id that may encode a delegated namespace
 * (e.g. `wallet:eip155` → `eip155`) back to the concrete namespace the
 * wallet actually serves. Returns `undefined` if the scope doesn't map to
 * a concrete namespace.
 */
export const resolveProposalNamespaceKey = (
  scopeOrChain: string,
): string | undefined => {
  if (!scopeOrChain) {
    return undefined;
  }
  if (!scopeOrChain.startsWith(WALLET_PREFIX)) {
    // Plain namespace or CAIP-2 chain id — take the first segment.
    return scopeOrChain.split(':')[0];
  }
  const delegated = scopeOrChain.slice(WALLET_PREFIX.length);
  // `wallet:` on its own is a meta scope, not a concrete namespace.
  return delegated.length > 0 ? delegated : undefined;
};

/**
 * Collect every concrete namespace key implied by a proposal.
 *
 * Accounts for top-level keys of requiredNamespaces / optionalNamespaces,
 * namespaces referenced via `wallet:<namespace>` delegated scopes, and
 * namespaces referenced by bare CAIP-2 chain ids on any scope.
 *
 * Returns a new Set each call.
 */
export const collectRequestedNamespaceKeys = (
  proposal: ProposalLike,
): Set<string> => {
  const keys = new Set<string>();

  const scopeMaps = [
    proposal.requiredNamespaces ?? {},
    proposal.optionalNamespaces ?? {},
  ];

  for (const scopeMap of scopeMaps) {
    for (const scopeKey of Object.keys(scopeMap)) {
      const resolved = resolveProposalNamespaceKey(scopeKey);
      if (resolved) {
        keys.add(resolved);
      }
      const chains = scopeMap[scopeKey]?.chains ?? [];
      for (const chain of chains) {
        const resolvedChain = resolveProposalNamespaceKey(chain);
        if (resolvedChain) {
          keys.add(resolvedChain);
        }
      }
    }
  }

  return keys;
};

/**
 * Build the approved namespaces map for a session proposal, consulting each
 * registered chain adapter. The result contains only namespaces the dapp
 * actually requested (directly or via a `wallet:<namespace>` delegated scope).
 *
 * Adapters that opt in via `onBeforeApprove` run first so any side-effect
 * driven state (e.g. Tron seeding permitted accounts) is visible to the
 * namespace builders.
 */
export const buildApprovedNamespaces = async ({
  proposal,
  channelId,
}: {
  proposal: ProposalLike;
  channelId: string;
}): Promise<ApprovedNamespaces> => {
  const requestedKeys = collectRequestedNamespaceKeys(proposal);

  const adapters = getAllAdapters().filter((adapter) =>
    requestedKeys.has(adapter.namespace),
  );

  for (const adapter of adapters) {
    if (adapter.onBeforeApprove) {
      try {
        await adapter.onBeforeApprove({ proposal, channelId });
      } catch (err) {
        // Side-effect errors must not block namespace building — if the
        // adapter still returns a valid NamespaceConfig the session can
        // proceed. We swallow silently here; adapters should log internally.
      }
    }
  }

  const namespaces: ApprovedNamespaces = {};
  for (const adapter of adapters) {
    const config = await adapter.buildNamespace({ proposal, channelId });
    if (config) {
      namespaces[adapter.namespace] = config;
    }
  }

  // Dapps that requested `wallet:eip155` may still look up a `wallet`
  // namespace in their session restore path. Mirror the eip155 slice under
  // the `wallet` key so the dapp universal provider finds it.
  const hasWalletEip155 = Object.values(proposal.requiredNamespaces ?? {})
    .concat(Object.values(proposal.optionalNamespaces ?? {}))
    .some((ns) => ns?.chains?.includes('wallet:eip155'));

  if (hasWalletEip155 && namespaces[KnownCaipNamespace.Eip155]) {
    const eip155 = namespaces[KnownCaipNamespace.Eip155];
    namespaces[KnownCaipNamespace.Wallet] = {
      chains: ['wallet:eip155'],
      methods: eip155.methods,
      events: eip155.events,
      accounts: eip155.accounts.map((account) => {
        const address = account.split(':').slice(2).join(':');
        return `wallet:eip155:${address}`;
      }),
    };
  }

  return namespaces;
};

/**
 * Drop namespaces from `namespaces` that the dapp did not request (neither
 * as a top-level scope key nor implicitly via `wallet:<ns>` / bare chain
 * references). Optionally preserves additional keys that were already
 * approved in a previous session update.
 *
 * The returned map is always a new object.
 */
export const filterToRequestedNamespaces = (
  namespaces: ApprovedNamespaces,
  proposal: ProposalLike,
  { preserveKeys }: { preserveKeys?: Iterable<string> } = {},
): ApprovedNamespaces => {
  const allowed = collectRequestedNamespaceKeys(proposal);
  // `wallet` is a delegated-alias namespace — allow it through whenever the
  // proposal mentioned any `wallet:<ns>` scope, so the companion mirroring
  // built by `buildApprovedNamespaces` survives the filter.
  if (allowed.size > 0) {
    const hasWalletScope = [
      ...Object.keys(proposal.requiredNamespaces ?? {}),
      ...Object.keys(proposal.optionalNamespaces ?? {}),
    ].some(
      (key) =>
        key === KnownCaipNamespace.Wallet || key.startsWith(WALLET_PREFIX),
    );

    const hasWalletChain = Object.values(proposal.requiredNamespaces ?? {})
      .concat(Object.values(proposal.optionalNamespaces ?? {}))
      .some((ns) =>
        ns?.chains?.some((chain) => chain.startsWith(WALLET_PREFIX)),
      );

    if (hasWalletScope || hasWalletChain) {
      allowed.add(KnownCaipNamespace.Wallet);
    }
  }

  if (preserveKeys) {
    for (const key of preserveKeys) {
      allowed.add(key);
    }
  }

  const out: ApprovedNamespaces = {};
  for (const [key, value] of Object.entries(namespaces)) {
    if (allowed.size === 0 || allowed.has(key)) {
      out[key] = value;
    }
  }
  return out;
};

/**
 * Partial namespace slice, matching what WalletConnect hands us from a
 * persisted `SessionTypes.Struct` (every field can be missing/undefined).
 */
export interface PartialNamespaceConfig {
  chains?: string[];
  methods?: string[];
  events?: string[];
  accounts?: string[];
}

/**
 * Sanitize a session namespaces map so every slice has arrays for
 * `chains`, `methods`, `events`, and `accounts`. If `chains` is missing,
 * derive it from the CAIP-10 prefixes of the `accounts` entries.
 *
 * WalletConnect returns slices with missing fields from persistence in some
 * flows; dapp providers reading `.chains.length` crash when that's undefined.
 */
export const normalizeSessionNamespaces = (
  namespaces: Record<string, PartialNamespaceConfig | undefined> | undefined,
): ApprovedNamespaces => {
  const out: ApprovedNamespaces = {};
  for (const [key, config] of Object.entries(namespaces ?? {})) {
    const accounts = Array.isArray(config?.accounts) ? config.accounts : [];
    const derivedChains = Array.from(
      new Set(
        accounts
          .map((account) => account.split(':').slice(0, 2).join(':'))
          .filter((chain) => chain.includes(':')),
      ),
    );
    out[key] = {
      chains:
        Array.isArray(config?.chains) && config.chains.length > 0
          ? config.chains
          : derivedChains,
      methods: Array.isArray(config?.methods) ? config.methods : [],
      events: Array.isArray(config?.events) ? config.events : [],
      accounts,
    };
  }
  return out;
};

/**
 * Merge a freshly-computed namespaces map on top of the session's current
 * namespaces. Keys present in both favor `computed`. Keys only in `current`
 * are preserved (e.g. a previously approved namespace that no longer has a
 * matching adapter response should stay in the session).
 */
export const mergeApprovedWithSession = (
  current: Record<string, PartialNamespaceConfig | undefined> | undefined,
  computed: ApprovedNamespaces,
): ApprovedNamespaces => ({
  ...normalizeSessionNamespaces(current),
  ...computed,
});

/** True if the namespaces object has no slices with any chains. */
export const isEmptyApprovedNamespaces = (
  namespaces: ApprovedNamespaces,
): boolean =>
  Object.values(namespaces).every((ns) => !ns.chains || ns.chains.length === 0);

/**
 * Look up which methods require redirecting the user back to the dapp for
 * a given CAIP-2 chain id (delegates to the adapter registry).
 */
export const getRedirectMethodsForChain = (caipChainId: string): string[] => {
  const namespace = caipChainId.split(':')[0];
  if (!namespace) {
    return [];
  }
  return getAdapter(namespace)?.redirectMethods ?? [];
};
