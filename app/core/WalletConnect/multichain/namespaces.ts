/**
 * Generic non-EVM namespace builder for WalletConnect session approval.
 *
 * Iterates the registered chain adapters and asks each one whether the dapp
 * proposal requested it. EVM is never touched: the EVM namespace is built
 * upstream by `getScopedPermissions`.
 */

import { KnownCaipNamespace } from '@metamask/utils';

import DevLogger from '../../SDKConnect/utils/DevLogger';
import { getAllNonEvmAdapters } from './registry';
import type { NamespaceConfig, ProposalLike } from './types';

const collectScopeKeys = (proposal: ProposalLike): string[] => [
  ...Object.keys(proposal.requiredNamespaces ?? {}),
  ...Object.keys(proposal.optionalNamespaces ?? {}),
];

const collectAllChains = (proposal: ProposalLike): string[] => [
  ...Object.values(proposal.requiredNamespaces ?? {}).flatMap(
    (ns) => ns?.chains ?? [],
  ),
  ...Object.values(proposal.optionalNamespaces ?? {}).flatMap(
    (ns) => ns?.chains ?? [],
  ),
];

/**
 * True when the proposal references `namespace` either as a top-level scope
 * key (`tron`) or via a bare CAIP-2 chain id whose namespace matches
 * (`tron:728126428`).
 */
export const proposalReferencesNamespace = (
  proposal: ProposalLike,
  namespace: string,
): boolean => {
  if (collectScopeKeys(proposal).includes(namespace)) return true;
  return collectAllChains(proposal).some(
    (chain) => chain.split(':')[0] === namespace,
  );
};

/**
 * For each registered non-EVM adapter that the dapp proposal asked for,
 * run any pre-approval side effect (e.g. seed permissioned accounts) and
 * inject the adapter's namespace slice into `namespaces` in place.
 *
 * EVM namespaces already present in `namespaces` are never modified.
 */
export const addNonEvmNamespacesIfRequested = ({
  namespaces,
  proposal,
  channelId,
}: {
  namespaces: Record<string, NamespaceConfig>;
  proposal: ProposalLike;
  channelId: string;
}): void => {
  for (const adapter of getAllNonEvmAdapters()) {
    if (adapter.namespace === KnownCaipNamespace.Eip155) {
      // Defensive guard: EVM is owned by the main code path and must not
      // appear in the non-EVM registry.
      continue;
    }

    if (!proposalReferencesNamespace(proposal, adapter.namespace)) {
      continue;
    }

    try {
      adapter.onBeforeApprove?.({ proposal, channelId });
    } catch (err) {
      DevLogger.log(
        `[wc][multichain] onBeforeApprove failed for ${adapter.namespace}`,
        err,
      );
    }

    const slice = adapter.buildNamespaceSlice({ proposal, channelId });
    if (slice) {
      namespaces[adapter.namespace] = slice;
    }
  }
};
