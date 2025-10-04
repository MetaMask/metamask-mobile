import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { AccountGroupWithInternalAccounts } from '../../selectors/multichainAccounts/accounts.type';

/**
 * Creates CaipAccountIds by enumerating over all scopes and creating account IDs
 * for each scope that the account groups support.
 *
 * Optimized version with early returns and reduced iterations.
 *
 * @param accountGroups - Array of account groups with internal accounts
 * @param scopes - Array of CAIP chain IDs to match against
 * @returns Array of CAIP account IDs that match the provided scopes
 */
export const getCaip25AccountFromAccountGroupAndScope = (
  accountGroups: AccountGroupWithInternalAccounts[],
  scopes: CaipChainId[],
): CaipAccountId[] => {
  if (!accountGroups.length || !scopes.length) {
    return [];
  }

  const wildcardEvmScope = `${KnownCaipNamespace.Eip155}:0`;
  const caipAccountIds: CaipAccountId[] = [];

  // Pre-parse scopes to avoid repeated parsing
  const parsedScopes = scopes
    .map((scope) => {
      try {
        const parsed = parseCaipChainId(scope);
        return { scope, namespace: parsed.namespace };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { scope: CaipChainId; namespace: string }[];

  // Enumerate over each valid scope to find supporting accounts
  for (const { scope, namespace } of parsedScopes) {
    for (const accountGroup of accountGroups) {
      for (const account of accountGroup.accounts) {
        const accountScopesSet = new Set(account.scopes);

        const accountSupportsScope =
          namespace === KnownCaipNamespace.Eip155
            ? accountScopesSet.has(wildcardEvmScope) ||
              accountScopesSet.has(scope)
            : accountScopesSet.has(scope);

        if (accountSupportsScope) {
          caipAccountIds.push(`${scope}:${account.address}` as CaipAccountId);
        }
      }
    }
  }

  return caipAccountIds;
};
