/**
 * High-level orchestration helpers for the multichain adapter layer.
 *
 * `WalletConnectV2._handleSessionProposal` and
 * `WalletConnect2Session.updateSession` use these to seed permissions,
 * build session namespace slices, and decide which namespace keys are
 * legitimately requested by the dapp — without ever importing a
 * specific adapter/chain.
 */
import {
  parseCaipChainId,
  parseCaipAccountId,
  type CaipChainId,
  type CaipAccountId,
  type KnownCaipNamespace,
} from '@metamask/utils';
import DevLogger from '../../SDKConnect/utils/DevLogger';

import { getAllAdapters, getAdapter } from './registry';
import type {
  NamespaceConfig,
  ProposalLike,
  ApprovedNamespaces,
  SnapMappedRequest,
} from './types';

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
  existingNamespaces?: Partial<
    Record<KnownCaipNamespace, Partial<NamespaceConfig>>
  >;
}): ApprovedNamespaces => {
  const namespaces: ApprovedNamespaces = {};
  for (const adapter of getAllAdapters()) {
    const existing = existingNamespaces[adapter.namespace];
    const config = adapter.buildNamespace({
      proposal,
      existingAccounts: existing?.accounts,
      existingMethods: existing?.methods,
      existingEvents: existing?.events,
    });
    if (config) {
      namespaces[adapter.namespace] = config;
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

/**
 * Build this chain's namespace slice from the wallet's current state
 * What the wallet is *capable of exposing* for this channel, independent of
 * any dapp proposal.
 */
export const buildAdapterScopedPermissionsNamespaces = ({
  channelId,
  permittedChains,
}: {
  channelId: string;
  permittedChains: CaipChainId[];
}): Record<string, NamespaceConfig> => {
  const namespaces: Record<string, NamespaceConfig> = {};
  for (const adapter of getAllAdapters()) {
    const config = adapter.buildScopedPermissionsNamespace({
      channelId,
      permittedChains,
    });
    if (config) {
      namespaces[adapter.namespace] = config;
    }
  }
  return namespaces;
};

/**
 * Normalize a CAIP chain id from WC into the shape the Snap expects.
 */
export const normalizeCaipChainIdInbound = (
  caipChainId: CaipChainId,
): CaipChainId => {
  const { namespace } = parseCaipChainId(caipChainId);
  for (const adapter of getAllAdapters()) {
    if (namespace === adapter.namespace) {
      return adapter.normalizeCaipChainIdInbound?.(caipChainId) ?? caipChainId;
    }
  }

  return caipChainId;
};

/**
 * Normalize a CAIP chain id from the Snap back into the shape WC expects.
 */
export const normalizeCaipChainIdOutbound = (
  caipChainId: CaipChainId,
): CaipChainId => {
  const { namespace } = parseCaipChainId(caipChainId);
  for (const adapter of getAllAdapters()) {
    if (namespace === adapter.namespace) {
      return adapter.normalizeCaipChainIdOutbound?.(caipChainId) ?? caipChainId;
    }
  }

  return caipChainId;
};

/**
 * Normalize a CAIP account id from WC into the shape the Snap expects.
 */
export const normalizeCaipAccountIdInbound = (
  caipAccountId: CaipAccountId,
): CaipAccountId => {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdInbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
};

/**
 * Normalize a CAIP account id from the Snap back into the shape WC expects.
 */
export const normalizeCaipAccountIdOutbound = (
  caipAccountId: CaipAccountId,
): CaipAccountId => {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdOutbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
};

/**
 * Translate a WalletConnect request into the parameter shape the
 * Snap behind this scope expects. Falls through unchanged when no
 * adapter matches.
 */
export const mapRequestInbound = ({
  scope,
  method,
  params,
}: {
  scope: CaipChainId;
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.mapRequestInbound({ method, params }) ?? { method, params };
};

/**
 * Normalize the Snap result back into the shape the dapp expects.
 * Falls through unchanged when no adapter matches.
 */
export const mapRequestOutbound = ({
  scope,
  method,
  params,
  result,
}: {
  scope: CaipChainId;
  method: string;
  params: unknown;
  result: unknown;
}): unknown => {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.mapRequestOutbound({ method, params, result }) ?? result;
};

/**
 * Methods (across all chains) that should redirect the user back to the dapp.
 **/
export const getRedirectMethodsForChain = (
  scope: CaipChainId,
): readonly string[] => {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.redirectMethods ?? [];
};

/**
 * Whether this method (across all chains) should redirect the user back to the dapp.
 */
export const isRedirectMethodForChain = ({
  scope,
  method,
}: {
  scope: CaipChainId;
  method: string;
}): boolean => {
  const redirectMethods = getRedirectMethodsForChain(scope);
  return redirectMethods.includes(method);
};
