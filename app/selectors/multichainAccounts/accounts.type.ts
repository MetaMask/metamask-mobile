import { AccountGroupObject } from '@metamask/account-tree-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAccountId, CaipChainId } from '@metamask/utils';

export type MultichainAccountId = AccountGroupObject['id'];
export type MultichainAccountGroupToScopesMap = Map<
  MultichainAccountId,
  MultichainAccountGroupScopeToCaipAccountId
>;
export type MultichainAccountGroupScopeToCaipAccountId = Map<
  CaipChainId,
  CaipAccountId
>;

export type AccountGroupWithInternalAccounts = {
  [K in keyof AccountGroupObject]: K extends 'accounts'
    ? InternalAccount[]
    : AccountGroupObject[K];
};
