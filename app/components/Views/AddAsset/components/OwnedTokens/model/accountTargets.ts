import { KnownCaipNamespace, type CaipChainId } from '@metamask/utils';
import type { OwnedTokenAccount, OwnedTokenAccountTarget } from './types';

/** Keeps each Accounts API URL well under typical proxy limits. */
export const OWNED_TOKENS_ACCOUNT_CHUNK_SIZE = 20;

const EVM_WILDCARD_SCOPE = `${KnownCaipNamespace.Eip155}:0`;

const caipAccountId = (
  chainId: string,
  address: string,
  namespace: string,
): string => {
  const accountAddress =
    namespace === KnownCaipNamespace.Eip155 ? address.toLowerCase() : address;
  return `${chainId}:${accountAddress}`;
};

/**
 * CAIP-10 ids for every account in the group, crossed with enabled chains
 * that account's scopes support. `eip155:0` matches every enabled EVM chain.
 * Non-EVM scopes must match exactly.
 */
export const buildOwnedTokenAccountTargets = (
  accounts: readonly OwnedTokenAccount[],
  enabledChainIds: readonly string[],
): OwnedTokenAccountTarget[] => {
  const targets: OwnedTokenAccountTarget[] = [];
  const seen = new Set<string>();

  enabledChainIds.forEach((chainId) => {
    const colon = chainId.indexOf(':');
    if (colon <= 0) {
      return;
    }
    const namespace = chainId.slice(0, colon);
    accounts.forEach((account) => {
      const supportsChain =
        namespace === KnownCaipNamespace.Eip155
          ? account.scopes.includes(EVM_WILDCARD_SCOPE) ||
            account.scopes.includes(chainId)
          : account.scopes.includes(chainId);
      if (!supportsChain) {
        return;
      }
      const id = caipAccountId(chainId, account.address, namespace);
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      targets.push({
        caipAccountId: id,
        internalAccountId: account.id,
        chainId,
        accountName: account.name,
      });
    });
  });

  return targets;
};

export const chunkList = <Item>(
  items: readonly Item[],
  size = OWNED_TOKENS_ACCOUNT_CHUNK_SIZE,
): Item[][] => {
  if (size <= 0) {
    return items.length ? [[...items]] : [];
  }
  const chunks: Item[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const chainIdFromCaipAccountId = (
  accountId: string,
): CaipChainId | undefined => {
  const first = accountId.indexOf(':');
  const second = accountId.indexOf(':', first + 1);
  if (first <= 0 || second <= first) {
    return undefined;
  }
  return accountId.slice(0, second) as CaipChainId;
};

export const lookupAccountTarget = (
  targetsByAccountId: ReadonlyMap<string, OwnedTokenAccountTarget>,
  accountId: string,
): OwnedTokenAccountTarget | undefined => {
  const direct = targetsByAccountId.get(accountId);
  if (direct) {
    return direct;
  }
  const chainId = chainIdFromCaipAccountId(accountId);
  if (!chainId?.startsWith(`${KnownCaipNamespace.Eip155}:`)) {
    return undefined;
  }
  const address = accountId.slice(chainId.length + 1);
  return targetsByAccountId.get(`${chainId}:${address.toLowerCase()}`);
};
