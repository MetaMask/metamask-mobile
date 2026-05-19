import { type CaipChainId, type KnownCaipNamespace } from '@metamask/utils';
import { ProposalParamsLight } from './types';
/**
 * Collect every CAIP-2 chain id requested for a given namespace.
 *
 * A dapp can request a namespace in two ways:
 * - As a top-level namespace key (`<namespace>`) with chains listed in `chains`.
 * - As a chain-scoped namespace key (`<namespace>:<reference>`), where the key itself is already a CAIP-2 chain id.
 *
 * Only namespace keys equal to `<namespace>` or starting with `<namespace>:` are considered.
 * Duplicates are removed.
 */
export const collectRequestedChainsForNamespace = ({
  proposal,
  namespace,
}: {
  proposal: ProposalParamsLight;
  namespace: KnownCaipNamespace;
}): CaipChainId[] => {
  const allNamespaces = {
    ...(proposal.optionalNamespaces ?? {}),
    ...(proposal.requiredNamespaces ?? {}),
  };
  const namespacePrefix = `${namespace}:`;
  const chains: string[] = [];

  for (const [key, config] of Object.entries(allNamespaces)) {
    if (key === namespace) {
      chains.push(
        ...(config?.chains?.filter((chain) =>
          chain.startsWith(namespacePrefix),
        ) ?? []),
      );
      continue;
    }

    if (key.startsWith(namespacePrefix)) {
      chains.push(key);
      chains.push(
        ...(config?.chains?.filter((chain) =>
          chain.startsWith(namespacePrefix),
        ) ?? []),
      );
    }
  }

  return Array.from(new Set(chains)) as CaipChainId[];
};

/**
 * Returns `true` when the dapp proposal references the given namespace,
 * either via a top-level `<namespace>` key or via a chain-scoped
 * `<namespace>:<reference>` namespace key.
 */
export const doesProposalIncludeNamespace = ({
  proposal,
  namespace,
}: {
  proposal: ProposalParamsLight;
  namespace: KnownCaipNamespace;
}): boolean =>
  collectRequestedChainsForNamespace({ proposal, namespace }).length > 0;
