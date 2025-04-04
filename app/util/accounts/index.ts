// External dependencies.
import {
  Account,
  EnsByAccountAddress,
} from '../../components/hooks/useAccounts';
import { safeToChecksumAddress } from '../address';
import { isDefaultAccountName } from '../ENSUtils';

/**
 * Gets the Account nickname, ENS name, or default account name - Whichever one is available.
 *
 * @param  params.accountAddress - Address of the account.
 * @param  params.accounts - Array of accounts returned from useAccounts hook.
 * @param  params.ensByAccountAddress - ENS name map returned from useAccounts hook.
 * @returns - Account nickname, ENS name, or default account name.
 */
export const getAccountNameWithENS = ({
  accountAddress,
  accounts,
  ensByAccountAddress,
}: {
  accountAddress: string;
  accounts: Account[];
  ensByAccountAddress: EnsByAccountAddress;
}) => {
  const account = accounts.find(
    ({ address }) =>
      safeToChecksumAddress(address) === safeToChecksumAddress(accountAddress),
  );
  const ensName = ensByAccountAddress[accountAddress];
  return isDefaultAccountName(account?.name) && ensName
    ? ensName
    : account?.name || '';
};

export default getAccountNameWithENS;
