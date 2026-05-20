import {
  type CaipAccountId,
  type CaipChainId,
  type KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import Engine from '../../Engine';
import { areAddressesEqual } from '../../../util/address';
import { ProposalParamsLight } from './types';
/**
 * Collect every CAIP-2 chain id a proposal requested for a namespace.
 *
 * Dapps can target a namespace either via a top-level key (`<namespace>`)
 * with chains listed in `chains`, or via a chain-scoped key
 * (`<namespace>:<reference>`). Both are accepted; duplicates removed.
 */
export function collectRequestedChainsForNamespace({
  proposal,
  namespace,
}: {
  proposal: ProposalParamsLight;
  namespace: KnownCaipNamespace;
}): CaipChainId[] {
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
}

/**
 * True when the proposal references the namespace in any form.
 */
export function doesProposalIncludeNamespace({
  proposal,
  namespace,
}: {
  proposal: ProposalParamsLight;
  namespace: KnownCaipNamespace;
}): boolean {
  return collectRequestedChainsForNamespace({ proposal, namespace }).length > 0;
}

/**
 * Selected non-EVM address for a CAIP-2 chain, from AccountTree.
 */
function getSelectedNonEvmAddressByChainId({
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
 * Sort the currently selected non-EVM account first for each chain.
 */
export function prioritizeSelectedNonEvmCaipAccountIds(
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
        getSelectedNonEvmAddressByChainId({
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
 *
 * Used for chains following the Reown convention (dapps send hex, the Snap
 * consumes decimal). Solana / Bitcoin do not follow this convention.
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
