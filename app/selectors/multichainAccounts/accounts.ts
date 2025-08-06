import {
  AccountGroupId,
  AccountWalletCategory,
  AccountWalletId,
} from '@metamask/account-api';
import { createDeepEqualSelector } from '../util';
import {
  AccountGroupObject,
  AccountTreeControllerState,
} from '@metamask/account-tree-controller';
import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectInternalAccounts } from '../accountsController';
import { selectAccountTreeControllerState } from '../../multichain-accounts/selectors/accountTreeController';

export const selectMultichainAccountGroupById = createDeepEqualSelector(
  selectAccountTreeControllerState,
  (_, accountId: AccountGroupId) => accountId,
  (accountTreeState: AccountTreeControllerState, accountId: AccountGroupId) => {
    const { wallets } = accountTreeState.accountTree;

    const [walletId] = accountId.split('/');
    const wallet = wallets[walletId as AccountWalletId];

    return wallet?.groups[accountId as AccountGroupId];
  },
);

export const selectAccountGroups = createDeepEqualSelector(
  selectAccountTreeControllerState,
  (accountTreeState: AccountTreeControllerState) => {
    const { wallets } = accountTreeState.accountTree;

    return Object.values(wallets).flatMap((wallet) =>
      Object.values(wallet.groups),
    );
  },
);

export const selectMultichainAccountGroups = createDeepEqualSelector(
  selectAccountGroups,
  (accountGroups: AccountGroupObject[]) =>
    accountGroups.filter((group) =>
      group.id.startsWith(AccountWalletCategory.Entropy),
    ),
);

export const selectNonMultichainAccountGroups = createDeepEqualSelector(
  selectAccountGroups,
  (accountGroups: AccountGroupObject[]) =>
    accountGroups.filter(
      (group) => !group.id.startsWith(AccountWalletCategory.Entropy),
    ),
);

type MultichainAccountId = AccountGroupObject['id'];
type MultichainAccountGroupToScopesMap = Map<
  MultichainAccountId,
  MultichainAccountGroupScopeToCaipAccountId
>;
type MultichainAccountGroupScopeToCaipAccountId = Map<
  CaipChainId,
  CaipAccountId
>;

export const selectCaip25AccountIdToMultichainAccountGroupMap =
  createDeepEqualSelector(
    selectAccountGroups,
    selectInternalAccounts,
    (
      accountGroups: AccountGroupObject[],
      internalAccounts: InternalAccount[],
    ) => {
      const caip25AccountIdToMultichainAccountGroupMap: Map<
        CaipAccountId,
        MultichainAccountId
      > = new Map();
      accountGroups.forEach((accountGroup) => {
        accountGroup.accounts.forEach((accountId) => {
          const internalAccount = internalAccounts.find(
            (account) => account.id === accountId,
          );
          if (!internalAccount) {
            return;
          }
          const [caip25Id] = internalAccount.scopes;
          if (caip25Id) {
            caip25AccountIdToMultichainAccountGroupMap.set(
              `${caip25Id}:${internalAccount.address}`,
              accountGroup.id,
            );
          }
        });
      });
      return caip25AccountIdToMultichainAccountGroupMap;
    },
  );

export type AccountGroupWithInternalAccounts = Omit<
  AccountGroupObject,
  'accounts'
> & {
  accounts: InternalAccount[];
};

export const selectAccountGroupWithInternalAccounts = createDeepEqualSelector(
  selectAccountGroups,
  selectInternalAccounts,
  (
    accountGroups: AccountGroupObject[],
    internalAccounts: InternalAccount[],
  ): AccountGroupWithInternalAccounts[] =>
    accountGroups.map((accountGroup) => ({
      ...accountGroup,
      accounts: accountGroup.accounts
        .map((accountId: string) => {
          const internalAccount = internalAccounts.find(
            (account) => account.id === accountId,
          );
          return internalAccount;
        })
        .filter((account) => account !== undefined),
    })),
);

export const selectMultichainAccountsToScopesMap = createDeepEqualSelector(
  selectMultichainAccountGroups,
  selectInternalAccounts,
  (
    multichainAccounts: AccountGroupObject[],
    internalAccounts: InternalAccount[],
  ) => {
    const multichainAccountsToScopesMap: MultichainAccountGroupToScopesMap =
      new Map();

    multichainAccounts.forEach((multichainAccount) => {
      const multichainAccountIdToCaip25Ids: MultichainAccountGroupScopeToCaipAccountId =
        new Map();

      Object.values(multichainAccount.accounts).forEach((internalAccountId) => {
        const internalAccount = internalAccounts.find(
          (account) => account.id === internalAccountId,
        );

        if (!internalAccount) {
          return;
        }
        const [caip25Id] = internalAccount.scopes;
        if (caip25Id) {
          const [namespace, reference] = caip25Id.split(':');
          multichainAccountIdToCaip25Ids.set(
            caip25Id,
            `${namespace}:${reference}:${internalAccount.address}`,
          );
        }
      });

      multichainAccountsToScopesMap.set(
        multichainAccount.id,
        multichainAccountIdToCaip25Ids,
      );
    });

    return multichainAccountsToScopesMap;
  },
);

export const selectCaip25IdByAccountGroupAndScope = createDeepEqualSelector(
  selectMultichainAccountsToScopesMap,
  (_, accountGroup: AccountGroupObject, scope: CaipChainId) => ({
    accountGroup,
    scope,
  }),
  (
    multichainAccountsToScopesMap: MultichainAccountGroupToScopesMap,
    { accountGroup, scope },
  ) => {
    const multichainAccountGroup = multichainAccountsToScopesMap.get(
      accountGroup.id,
    );
    if (!multichainAccountGroup) {
      return undefined;
    }
    return multichainAccountGroup.get(scope);
  },
);

export const selectMultichainAccountGroupsByScopes = createDeepEqualSelector(
  selectAccountGroupWithInternalAccounts,
  (_, scopes: CaipChainId[]) => scopes,
  (
    accountGroupsWithInternalAccounts: AccountGroupWithInternalAccounts[],
    scopes: CaipChainId[],
  ) => {
    console.log('scopes', scopes);
    const { cleanedScopes, hasEvmScope } = scopes.reduce(
      (acc, scope) => {
        const [namespace] = scope.split(':');
        if (namespace === KnownCaipNamespace.Eip155) {
          acc.hasEvmScope = true;
        } else {
          acc.cleanedScopes.push(scope);
        }
        return acc;
      },
      { cleanedScopes: [] as CaipChainId[], hasEvmScope: false },
    );

    console.log('hasEvmScope', hasEvmScope);
    // Can early return with all multichain account groups because they all have EVM scopes
    if (hasEvmScope) {
      return accountGroupsWithInternalAccounts;
    }

    const scopesToAccountGroupsMap = new Map<
      CaipChainId,
      AccountGroupWithInternalAccounts[]
    >();

    cleanedScopes.forEach((scope) => {
      const accountGroupsWithScope = accountGroupsWithInternalAccounts.filter(
        (accountGroup) =>
          accountGroup.accounts.some((internalAccount) =>
            internalAccount.scopes.includes(scope),
          ),
      );
      scopesToAccountGroupsMap.set(scope, accountGroupsWithScope);
    });

    return Array.from(scopesToAccountGroupsMap.values()).flat();
  },
);
