import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  toMultichainAccountGroupId,
  toMultichainAccountWalletId,
  type AccountGroupId,
} from '@metamask/account-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { isEvmAccountType } from '@metamask/keyring-api';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import useMoneyAccountInfo from './useMoneyAccountInfo';

/**
 * A selectable rescue-send recipient: an EVM account derived from the Money
 * Account's own SRP, excluding the Money Account address itself.
 */
export interface MusdRescueRecipient {
  /** Internal account id, unique per account and safe to use as a list key. */
  id: string;
  /** Checksummed EVM address. */
  address: string;
  /** User-facing account name. */
  name: string;
}

export interface UseMusdRescueRecipientsResult {
  /** Same-SRP EVM accounts that can receive the rescue send, in account order. */
  recipients: MusdRescueRecipient[];
}

/**
 * Resolves the accounts a liquid-mUSD rescue send may be sent to.
 *
 * The rescue send only moves funds between the user's own accounts, so the
 * recipient list is restricted to EVM accounts derived from the Money
 * Account's own SRP (same entropy source / multichain account group). Imported
 * private-key accounts, hardware wallets, other SRPs and the Money Account
 * address itself are never offered — that keeps a rescue withdrawal inside the
 * same seed phrase rather than allowing an arbitrary external address.
 *
 * @returns The selectable rescue-send recipients.
 */
const useMusdRescueRecipients = (): UseMusdRescueRecipientsResult => {
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const selectAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);

  const entropy = primaryMoneyAccount?.options?.entropy;
  const entropyId = entropy?.id;
  const groupIndex = entropy?.groupIndex;
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const recipients = useMemo(() => {
    if (!entropyId || groupIndex === undefined || !moneyAccountAddress) {
      return [];
    }

    const groupId = toMultichainAccountGroupId(
      toMultichainAccountWalletId(entropyId),
      groupIndex,
    );
    const moneyAccountAddressLower = moneyAccountAddress.toLowerCase();

    return selectAccountsByGroupId(groupId as AccountGroupId)
      .filter(
        (account: InternalAccount) =>
          isEvmAccountType(account.type) &&
          account.address.toLowerCase() !== moneyAccountAddressLower,
      )
      .map((account: InternalAccount) => ({
        id: account.id,
        address: account.address,
        name: account.metadata?.name ?? '',
      }));
  }, [entropyId, groupIndex, moneyAccountAddress, selectAccountsByGroupId]);

  return { recipients };
};

export default useMusdRescueRecipients;
