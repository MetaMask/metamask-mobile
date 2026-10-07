import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  toMultichainAccountWalletId,
  type AccountGroupId,
} from '@metamask/account-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { isEvmAccountType } from '@metamask/keyring-api';
import { selectAccountGroups } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
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
 * Account's own SRP (same entropy source): every account group under that
 * SRP's multichain wallet, not just the Money Account's own group. Imported
 * private-key accounts, hardware wallets, other SRPs and the Money Account
 * address itself are never offered — that keeps a rescue withdrawal inside
 * the same seed phrase rather than allowing an arbitrary external address.
 *
 * @returns The selectable rescue-send recipients.
 */
const useMusdRescueRecipients = (): UseMusdRescueRecipientsResult => {
  const { primaryMoneyAccount } = useMoneyAccountInfo();
  const accountGroups = useSelector(selectAccountGroups);
  const internalAccountsById = useSelector(selectInternalAccountsById);

  const entropy = primaryMoneyAccount?.options?.entropy;
  const entropyId = entropy?.id;
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const recipients = useMemo(() => {
    if (!entropyId || !moneyAccountAddress) {
      return [];
    }

    // Every group of the Money Account's SRP wallet — sibling HD accounts
    // live in other group indices and are equally valid rescue destinations.
    const walletId = toMultichainAccountWalletId(entropyId);
    const walletGroups = accountGroups.filter((group) =>
      group.id.startsWith(`${walletId}/`),
    );

    const moneyAccountAddressLower = moneyAccountAddress.toLowerCase();

    return walletGroups
      .flatMap((group) =>
        group.accounts
          .map((accountId) => internalAccountsById[accountId])
          .filter((account): account is InternalAccount => Boolean(account)),
      )
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
  }, [entropyId, moneyAccountAddress, accountGroups, internalAccountsById]);

  return { recipients };
};

export default useMusdRescueRecipients;
