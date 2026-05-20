import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AvatarAccountVariant } from '@metamask/design-system-react-native';
import I18n from '../../../../../../../locales/i18n';
import {
  selectInternalAccountsById,
  selectSelectedInternalAccount,
} from '../../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { selectBalanceBySelectedAccountGroup } from '../../../../../../selectors/assets/balances';
import { formatWithThreshold } from '../../../../../../util/assets';

const AVATAR_VARIANT_MAP: Record<string, AvatarAccountVariant> = {
  JazzIcon: AvatarAccountVariant.Jazzicon,
  Blockies: AvatarAccountVariant.Blockies,
  Maskicon: AvatarAccountVariant.Maskicon,
};

const selectSelectedAccountBalance = selectBalanceBySelectedAccountGroup();

export function useGlobalAccount() {
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const rawAvatarType = useSelector(selectAvatarAccountType);
  const groupBalance = useSelector(selectSelectedAccountBalance);

  // Derive display name via the account group, same as AccountSelector
  const name = useMemo(() => {
    if (!selectedInternalAccount) return undefined;
    const id = Object.keys(internalAccountsById).find(
      (accountId) =>
        internalAccountsById[accountId].address.toLowerCase() ===
        selectedInternalAccount.address.toLowerCase(),
    );
    return id
      ? accountToGroupMap[id]?.metadata?.name
      : selectedInternalAccount.metadata.name;
  }, [selectedInternalAccount, internalAccountsById, accountToGroupMap]);

  const formattedBalance = useMemo(() => {
    const totalBalance = groupBalance?.totalBalanceInUserCurrency;
    const userCurrency = groupBalance?.userCurrency;
    if (totalBalance == null || !userCurrency) return undefined;
    return formatWithThreshold(totalBalance, 0.01, I18n.locale, {
      style: 'currency',
      currency: userCurrency.toUpperCase(),
    });
  }, [groupBalance]);

  return {
    name,
    address: selectedInternalAccount?.address ?? '',
    avatarVariant:
      AVATAR_VARIANT_MAP[rawAvatarType] ?? AvatarAccountVariant.Jazzicon,
    formattedBalance,
  };
}
