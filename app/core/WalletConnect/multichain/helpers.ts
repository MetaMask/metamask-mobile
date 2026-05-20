/**
 * High-level orchestration helpers for the multichain adapter layer.
 *
 * `WalletConnectV2._handleSessionProposal` and
 * `WalletConnect2Session.updateSession` use these to seed permissions,
 * build session namespace slices, and decide which namespace keys are
 * legitimately requested by the dapp — without ever importing a
 * specific adapter/chain.
 */
import { parseCaipChainId, type CaipChainId } from '@metamask/utils';
import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import DevLogger from '../../SDKConnect/utils/DevLogger';

import { getAllAdapters, getAdapter } from './registry';
import type {
  AdapterHandleRequestArgs,
  NamespaceConfig,
  ProposalParamsLight,
} from './types';

/**
 * Shape of the proposal subset used to filter namespaces. Compatible with both
 * `SessionProposal['params']` and `SessionTypes.Struct` (active sessions).
 */
interface FilterableProposal {
  requiredNamespaces?: Record<string, unknown>;
  optionalNamespaces?: Record<string, unknown>;
}

/**
 * Drop any namespace key the dapp never referenced in its proposal.
 *
 * WalletKit rejects `approveSession` / `updateSession` payloads that advertise
 * namespaces the dapp didn't request. This helper keeps the call sites in
 * `WalletConnectV2` and `WalletConnect2Session` in sync — both must filter
 * their built `namespaces` map against the original proposal before forwarding
 * it to WalletKit.
 */
export function filterNamespacesByProposal({
  proposal,
  namespaces,
}: {
  proposal: FilterableProposal;
  namespaces: Record<string, NamespaceConfig>;
}): Record<string, NamespaceConfig> {
  const requestedKeys = new Set([
    ...Object.keys(proposal.requiredNamespaces ?? {}),
    ...Object.keys(proposal.optionalNamespaces ?? {}),
  ]);

  const filtered: Record<string, NamespaceConfig> = {};
  for (const key of requestedKeys) {
    if (namespaces[key]) {
      filtered[key] = namespaces[key];
    }
  }
  return filtered;
}

/**
 * Run every adapter caveat-enrichment hook for the given session proposal.
 * Adapters can use this to enrich the CAIP-25 caveat value before it is
 * persisted for the channel.
 *
 * Failures are logged but never rethrown so one chain's hook can't
 * abort the whole session approval.
 */
export function enrichCaveatValueWithAdapterPermissions({
  proposal,
  caveatValue,
}: {
  proposal: ProposalParamsLight;
  caveatValue: Caip25CaveatValue;
}): Caip25CaveatValue {
  let enrichedCaveatValue: Caip25CaveatValue = caveatValue;
  for (const adapter of getAllAdapters()) {
    try {
      enrichedCaveatValue =
        adapter.enrichCaveatValue?.({
          proposal,
          caveatValue: enrichedCaveatValue,
        }) ?? enrichedCaveatValue;
    } catch (err) {
      DevLogger.log(
        `[wc][multichain] enrichCaveatValue failed for ${adapter.namespace}`,
        err,
      );
    }
  }

  return enrichedCaveatValue;
}

/**
 * Collect sessionProperties contributed by every registered adapter for the
 * given session proposal. The result is merged into the WC `approveSession`
 * call so dapps can read adapter-specific signals (e.g. Tron's
 * `tron_method_version`).
 *
 * Failures are logged but never rethrown so one chain's hook can't abort the
 * whole session approval.
 */
export function buildSessionPropertiesFromAdapters({
  proposal,
}: {
  proposal: ProposalParamsLight;
}): Record<string, string> {
  let merged: Record<string, string> = {};
  for (const adapter of getAllAdapters()) {
    try {
      const props = adapter.getSessionProperties?.({ proposal });
      if (props) {
        merged = { ...merged, ...props };
      }
    } catch (err) {
      DevLogger.log(
        `[wc][multichain] getSessionProperties failed for ${adapter.namespace}`,
        err,
      );
    }
  }
  return merged;
}

/**
 * Build this chain's namespace slice from the wallet's current state
 * What the wallet is *capable of exposing* for this channel, independent of
 * any dapp proposal.
 */
export async function getAdaptersScopedPermissions(args: {
  channelId: string;
}): Promise<Record<string, NamespaceConfig>> {
  const namespaces: Record<string, NamespaceConfig> = {};
  for (const adapter of getAllAdapters()) {
    const config = await adapter.getScopedPermissions(args);
    if (config) {
      namespaces[adapter.namespace] = config;
    }
  }
  return namespaces;
}

/**
 * Normalize a CAIP chain id from WC into the shape the Snap expects.
 */
export function normalizeCaipChainIdInbound(
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace } = parseCaipChainId(caipChainId);
  for (const adapter of getAllAdapters()) {
    if (namespace === adapter.namespace) {
      return adapter.normalizeCaipChainIdInbound?.(caipChainId) ?? caipChainId;
    }
  }

  return caipChainId;
}

/**
 * Dispatch a WalletConnect request to the adapter registered for the scope's
 * CAIP-2 namespace.
 */
export async function handleAdapterRequest({
  scope,
  ...args
}: AdapterHandleRequestArgs): Promise<unknown> {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);

  if (!adapter) {
    throw new Error(`No WalletConnect adapter registered for ${namespace}`);
  }

  return adapter.handleRequest({ ...args, scope });
}

/**
 * Whether this method (across all chains) should redirect the user back to the dapp.
 */
export function isRedirectMethodForChain({
  scope,
  method,
}: {
  scope: CaipChainId;
  method: string;
}): boolean {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  const redirectMethods = adapter?.redirectMethods ?? [];
  return redirectMethods.includes(method);
}
