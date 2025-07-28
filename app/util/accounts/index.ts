// External dependencies.
import { isCaipAccountIdInPermittedAccountIds } from '@metamask/chain-agnostic-permission';
import {
  Account,
  EnsByAccountAddress,
} from '../../components/hooks/useAccounts';
import { isDefaultAccountName } from '../ENSUtils';
import {
  CaipAccountId,
  KnownCaipNamespace,
  parseCaipAccountId,
} from '@metamask/utils';

/**
 * Gets the Account nickname, ENS name, or default account name - Whichever one is available.
 *
 * @param  params.caipAccountId - Caip Account ID of the account.
 * @param  params.accounts - Array of accounts returned from useAccounts hook.
 * @param  params.ensByAccountAddress - ENS name map returned from useAccounts hook.
 * @returns - Account nickname, ENS name, or default account name.
 */
export const getAccountNameWithENS = ({
  caipAccountId,
  accounts,
  ensByAccountAddress,
}: {
  caipAccountId: CaipAccountId;
  accounts: Account[];
  ensByAccountAddress: EnsByAccountAddress;
}) => {
  const account = accounts.find((acc) =>
    isCaipAccountIdInPermittedAccountIds(acc.caipAccountId, [caipAccountId]),
  );

  const {
    address,
    chain: { namespace },
  } = parseCaipAccountId(caipAccountId);
  const ensName =
    namespace === KnownCaipNamespace.Eip155
      ? ensByAccountAddress[address]
      : undefined;
  return isDefaultAccountName(account?.name) && ensName
    ? ensName
    : account?.name || '';
};

export default getAccountNameWithENS;
