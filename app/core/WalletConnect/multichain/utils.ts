import {
  type CaipAccountId,
  type CaipChainId,
  type KnownCaipNamespace,
  parseCaipAccountId,
} from '@metamask/utils';
import Engine from '../../Engine';
import { areAddressesEqual } from '../../../util/address';
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
 * Returns `true` when the dapp proposal references the given namespace,
 * either via a top-level `<namespace>` key or via a chain-scoped
 * `<namespace>:<reference>` namespace key.
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
 * Returns the selected non-EVM address for a CAIP-2 chain from AccountTree selected group.
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
 * Prioritizes selected non-EVM CAIP account IDs for each chain.
 */
export function prioritizeSelectedNonEvmCaipAccountIds(
  caipAccountIds: CaipAccountId[],
): CaipAccountId[] {
  if (caipAccountIds.length < 2) {
    return [...caipAccountIds];
  }

  const selectedAddressByChainId: Record<string, string> = {};

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
