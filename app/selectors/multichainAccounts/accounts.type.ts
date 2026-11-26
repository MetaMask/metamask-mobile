import { AccountGroupObject } from '@metamask/account-tree-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';

export type AccountGroupWithInternalAccounts = {
  [K in keyof AccountGroupObject]: K extends 'accounts'
    ? InternalAccount[]
    : AccountGroupObject[K];
};
