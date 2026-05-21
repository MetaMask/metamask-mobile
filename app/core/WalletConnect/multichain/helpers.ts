/**
 * Adapter access helpers for the multichain layer.
 *
 * This file must only contain helpers that access or dispatch to adapters by
 * chain/namespace (registry lookup, adapter hooks, adapter request routing).
 *
 * Do not add generic reusable utilities here: put them in `utils.ts`.
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
 * Run every adapter's `enrichCaveatValue` hook on the CAIP-25 caveat before
 * it is persisted. Failures are logged, never rethrown, so a single chain
 * cannot block session approval.
 */
export function enrichCaveatValueByAdapters({
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
 * Merge sessionProperties contributed by every registered adapter. Forwarded
 * to `approveSession` so dapps can read adapter signals (e.g. Tron's
 * `tron_method_version`). Failures are logged, never rethrown.
 */
export function buildSessionPropertiesByAdapters({
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
 * Build the namespace slice every registered adapter is willing to expose
 * for this channel, independent of what the dapp asked for.
 */
export async function getScopedPermissionsByAdapters(args: {
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
 * Dispatch inbound normalization to the adapter whose namespace matches the
 * given CAIP chain id. Returns the id unchanged when no adapter matches.
 */
export function normalizeCaipChainIdInboundByAdapter(
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
 * Dispatch a WalletConnect request to the adapter for the scope's namespace.
 */
export async function handleRequestByAdapter({
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
 * Whether the given method should redirect the user back to the dapp after
 * the wallet handles it.
 */
export function isRedirectMethodByAdapterChain({
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
