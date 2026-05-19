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
} from '@metamask/utils';
import type { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import DevLogger from '../../SDKConnect/utils/DevLogger';

import { getAllAdapters, getAdapter } from './registry';
import type {
  NamespaceConfig,
  ProposalParamsLight,
  SnapMappedRequest,
} from './types';

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
 * Normalize a CAIP chain id from the Snap back into the shape WC expects.
 */
export function normalizeCaipChainIdOutbound(
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace } = parseCaipChainId(caipChainId);
  for (const adapter of getAllAdapters()) {
    if (namespace === adapter.namespace) {
      return adapter.normalizeCaipChainIdOutbound?.(caipChainId) ?? caipChainId;
    }
  }

  return caipChainId;
}

/**
 * Normalize a CAIP account id from WC into the shape the Snap expects.
 */
export function normalizeCaipAccountIdInbound(
  caipAccountId: CaipAccountId,
): CaipAccountId {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdInbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
}

/**
 * Normalize a CAIP account id from the Snap back into the shape WC expects.
 */
export function normalizeCaipAccountIdOutbound(
  caipAccountId: CaipAccountId,
): CaipAccountId {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdOutbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
}

/**
 * Translate a WalletConnect request into the parameter shape the
 * Snap behind this scope expects. Falls through unchanged when no
 * adapter matches.
 */
export function mapRequestInbound({
  scope,
  method,
  params,
}: {
  scope: CaipChainId;
  method: string;
  params: unknown;
}): SnapMappedRequest {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.mapRequestInbound({ method, params }) ?? { method, params };
}

/**
 * Normalize the Snap result back into the shape the dapp expects.
 * Falls through unchanged when no adapter matches.
 */
export function mapRequestOutbound({
  scope,
  method,
  params,
  result,
}: {
  scope: CaipChainId;
  method: string;
  params: unknown;
  result: unknown;
}): unknown {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.mapRequestOutbound({ method, params, result }) ?? result;
}

/**
 * Methods (across all chains) that should redirect the user back to the dapp.
 **/
export function getRedirectMethodsForChain(
  scope: CaipChainId,
): readonly string[] {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.redirectMethods ?? [];
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
  const redirectMethods = getRedirectMethodsForChain(scope);
  return redirectMethods.includes(method);
}
