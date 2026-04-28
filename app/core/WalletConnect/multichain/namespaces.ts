/**
 * High-level orchestration helpers for the multichain adapter layer.
 *
 * `WalletConnectV2._handleSessionProposal` and
 * `WalletConnect2Session.updateSession` use these to seed permissions,
 * build session namespace slices, and decide which namespace keys are
 * legitimately requested by the dapp — without ever importing a
 * specific chain.
 */

import DevLogger from '../../SDKConnect/utils/DevLogger';

import { getAllAdapters } from './registry';
import type { NamespaceConfig, ProposalLike } from './types';

export type ApprovedNamespaces = Record<string, NamespaceConfig>;

/**
 * Run every adapter's pre-approval hook for the given session proposal.
 * Adapters typically use this to seed Tron/Solana/etc. accounts into
 * the CAIP-25 caveat for the channel before namespaces are built.
 *
 * Failures are logged but never rethrown so one chain's hook can't
 * abort the whole session approval.
 */
export const seedAdapterPermissions = async ({
  proposal,
  channelId,
}: {
  proposal: ProposalLike;
  channelId: string;
}): Promise<void> => {
  for (const adapter of getAllAdapters()) {
    if (!adapter.onBeforeApprove) {
      continue;
    }
    try {
      await adapter.onBeforeApprove({ proposal, channelId });
    } catch (err) {
      DevLogger.log(
        `[wc][multichain] onBeforeApprove failed for ${adapter.namespace}`,
        err,
      );
    }
  }
};

/**
 * Ask every registered adapter to build its namespace slice from the
 * dapp proposal and any pre-existing approved namespaces. Returns only
 * the slices that the adapters chose to produce — the EVM `eip155`
 * namespace is built elsewhere and merged in by the caller.
 */
export const buildAdapterNamespaces = ({
  proposal,
  existingNamespaces = {},
}: {
  proposal: ProposalLike;
  existingNamespaces?: Record<string, Partial<NamespaceConfig> | undefined>;
}): ApprovedNamespaces => {
  const namespaces: ApprovedNamespaces = {};
  for (const adapter of getAllAdapters()) {
    const existing = existingNamespaces[adapter.namespace];
    const slice = adapter.buildNamespace({
      proposal,
      existingAccounts: existing?.accounts,
      existingMethods: existing?.methods,
      existingEvents: existing?.events,
    });
    if (slice) {
      namespaces[adapter.namespace] = slice;
    }
  }
  return namespaces;
};

/**
 * Returns the set of CAIP-2 namespaces this dapp proposal references
 * across all registered adapters. Useful for keeping non-EVM keys in
 * the `allowedNamespaceKeys` filter that drops un-requested namespaces
 * from the approved session.
 */
export const proposalReferencedAdapterNamespaces = (
  proposal: ProposalLike,
): string[] =>
  getAllAdapters()
    .filter((adapter) => adapter.proposalReferencesNamespace(proposal))
    .map((adapter) => adapter.namespace);
