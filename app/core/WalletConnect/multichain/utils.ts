/**
 * Generic reusable utilities for the multichain WalletConnect layer.
 *
 * Keep chain-agnostic helpers here (CAIP transforms, proposal filtering,
 * account ordering, shared utility logic).
 *
 * Do not add adapter lookup/dispatch helpers here: those belong in
 * `helpers.ts`.
 */

/**
 * For these utilities, we base ourselves on the specifications from the proposal, and notably that
 * all chains in the namespace MUST contain the namespace prefix:
 * https://specs.walletconnect.com/2.0/specs/clients/sign/namespaces#16-all-chains-in-the-namespace-must-contain-the-namespace-prefix
 */
import {
  type CaipAccountId,
  type CaipChainId,
  type KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import type { SessionTypes } from '@walletconnect/types';
import Engine from '../../Engine';
import { areAddressesEqual } from '../../../util/address';
import { NamespaceConfig, ProposalParamsLight } from './types';

type NamespaceReferenceSource = Partial<ProposalParamsLight> & {
  namespaces?: SessionTypes.Struct['namespaces'];
};

/**
 * Unique set of top-level namespace names referenced anywhere in a proposal
 * or active session (`namespaces`, `optionalNamespaces`, `requiredNamespaces`).
 *
 * Both key forms are normalized to the top-level namespace name: bare
 * (`eip155`) and chain-scoped (`eip155:1` → `eip155`). Spread-merging only
 * loses values on key collisions, never keys themselves.
 */
export function getReferencedNamespaces(
  proposalOrSession: NamespaceReferenceSource,
): Set<string> {
  const allNamespaces = {
    ...(proposalOrSession.namespaces ?? {}),
    ...(proposalOrSession.optionalNamespaces ?? {}),
    ...(proposalOrSession.requiredNamespaces ?? {}),
  };
  return new Set(
    Object.keys(allNamespaces).map((key) =>
      key.includes(':') ? parseCaipChainId(key as CaipChainId).namespace : key,
    ),
  );
}

/**
 * Drop any namespace key the dapp never referenced (proposal) or the
 * session never referenced. WalletKit rejects `approveSession` /
 * `updateSession` payloads that advertise unreferenced namespaces.
 */
export function filterNamespaces({
  proposalOrSession,
  namespaces,
}: {
  proposalOrSession: NamespaceReferenceSource;
  namespaces: Record<string, NamespaceConfig>;
}): Record<string, NamespaceConfig> {
  const referenced = getReferencedNamespaces(proposalOrSession);
  const filtered: Record<string, NamespaceConfig> = {};
  for (const key of Object.keys(namespaces)) {
    if (referenced.has(key)) {
      filtered[key] = namespaces[key];
    }
  }
  return filtered;
}

/**
 * Collect every CAIP-2 chain id a proposal requested for a namespace.
 *
 * Dapps can target a namespace either via a top-level key (`<namespace>`)
 * with chains listed in `chains`, or via a chain-scoped key
 * (`<namespace>:<reference>`). Chains from both `requiredNamespaces` and
 * `optionalNamespaces` are merged; duplicates removed.
 */
export function collectRequestedChainsForNamespace({
  proposal,
  namespace,
}: {
  proposal: ProposalParamsLight;
  namespace: KnownCaipNamespace;
}): CaipChainId[] {
  const namespacePrefix = `${namespace}:`;
  const chains = new Set<CaipChainId>();

  for (const map of [
    proposal.requiredNamespaces ?? {},
    proposal.optionalNamespaces ?? {},
  ]) {
    for (const [key, config] of Object.entries(map)) {
      if (key === namespace) {
        for (const chain of config?.chains ?? []) {
          chains.add(chain as CaipChainId);
        }
        continue;
      }
      if (key.startsWith(namespacePrefix)) {
        chains.add(key as CaipChainId);
      }
    }
  }

  return Array.from(chains);
}

/**
 * True when a proposal or active session references the namespace in any form.
 */
export function doesProposalOrSessionIncludeNamespace({
  proposalOrSession,
  namespace,
}: {
  proposalOrSession: NamespaceReferenceSource;
  namespace: KnownCaipNamespace;
}): boolean {
  return getReferencedNamespaces(proposalOrSession).has(namespace);
}

/**
 * Selected address for a CAIP-2 chain, from AccountTree.
 */
function getSelectedAddressByChainId({
  chainId,
}: {
  chainId: CaipChainId;
}): string | undefined {
  const { AccountTreeController } = Engine.context;
  const selectedAccountGroupAccounts =
    AccountTreeController.getAccountsFromSelectedAccountGroup();

  const matchingAccount = selectedAccountGroupAccounts.find((account) =>
    account.scopes.includes(chainId),
  );

  return matchingAccount?.address;
}

/**
 * Sort the currently selected account first for each chain.
 */
export function prioritizeSelectedCaipAccountIds(
  caipAccountIds: CaipAccountId[],
): CaipAccountId[] {
  if (caipAccountIds.length < 2) {
    return [...caipAccountIds];
  }

  const selectedAddressByChainId: Partial<Record<CaipChainId, string>> = {};

  for (const caipAccountId of caipAccountIds) {
    try {
      const { chainId } = parseCaipAccountId(caipAccountId);
      if (selectedAddressByChainId[chainId]) {
        continue;
      }

      selectedAddressByChainId[chainId] =
        getSelectedAddressByChainId({
          chainId,
        }) ?? '';
    } catch {
      // Keep invalid IDs in their original order.
    }
  }

  return [...caipAccountIds].sort((firstAccountId, secondAccountId) => {
    try {
      const firstParsed = parseCaipAccountId(firstAccountId);
      const secondParsed = parseCaipAccountId(secondAccountId);

      if (firstParsed.chainId !== secondParsed.chainId) {
        return 0;
      }

      const selectedAddress = selectedAddressByChainId[firstParsed.chainId];
      if (!selectedAddress) {
        return 0;
      }

      const isFirstSelected = areAddressesEqual(
        firstParsed.address,
        selectedAddress,
      );
      const isSecondSelected = areAddressesEqual(
        secondParsed.address,
        selectedAddress,
      );

      if (isFirstSelected === isSecondSelected) {
        return 0;
      }

      return isFirstSelected ? -1 : 1;
    } catch {
      return 0;
    }
  });
}

/**
 * Convert a CAIP-2 chain id reference from hex to decimal, gated by
 * namespace. Idempotent; passthrough for non-matching namespaces.
 */
export function caipChainIdHexToDecimal(
  namespace: KnownCaipNamespace,
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace: ns, reference } = parseCaipChainId(caipChainId);
  if (ns !== namespace || !reference.startsWith('0x')) {
    return caipChainId;
  }
  return `${ns}:${parseInt(reference, 16)}` as CaipChainId;
}

/**
 * Convert a CAIP-2 chain id reference from decimal to hex, gated by
 * namespace. Idempotent; passthrough for non-matching namespaces and for
 * references that are neither decimal nor hex.
 */
export function caipChainIdDecimalToHex(
  namespace: KnownCaipNamespace,
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace: ns, reference } = parseCaipChainId(caipChainId);
  if (
    ns !== namespace ||
    reference.startsWith('0x') ||
    !/^\d+$/.test(reference)
  ) {
    return caipChainId;
  }
  return `${ns}:0x${parseInt(reference, 10).toString(16)}` as CaipChainId;
}

/**
 * Re-anchor a CAIP-10 account id on a hex→decimal chain id.
 */
export function caipAccountIdHexToDecimal(
  namespace: KnownCaipNamespace,
  caipAccountId: CaipAccountId,
): CaipAccountId {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  return `${caipChainIdHexToDecimal(namespace, chainId)}:${address}` as CaipAccountId;
}

/**
 * Re-anchor a CAIP-10 account id on a decimal→hex chain id.
 */
export function caipAccountIdDecimalToHex(
  namespace: KnownCaipNamespace,
  caipAccountId: CaipAccountId,
): CaipAccountId {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  return `${caipChainIdDecimalToHex(namespace, chainId)}:${address}` as CaipAccountId;
}
