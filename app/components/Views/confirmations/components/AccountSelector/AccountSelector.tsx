import React, { useCallback, useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';
import { useSelector } from 'react-redux';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import {
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import MultichainAccountSelectorList from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList';
import { AccountSection } from '../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.types';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import {
  selectAccountGroupsByWallet,
  selectAccountToGroupMap,
} from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import stylesheet from './AccountSelector.styles';

export const ACCOUNT_SELECTOR_TEST_IDS = {
  PILL: 'account-selector-pill',
  MODAL: 'account-selector-modal',
};

export interface AccountSelectorProps {
  selectedAddress?: string;
  onAccountSelected: (address: string) => void;
  /** Label shown on the left side of the row. Defaults to the "To" i18n string. */
  label?: string;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedAddress,
  onAccountSelected,
  label = strings('confirm.label.to'),
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { styles, theme } = useStyles(stylesheet, {});

  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const getIsAccountSupported = useCallback(
    (account: AccountId) =>
      Boolean(internalAccountsById[account]?.scopes.includes(EthScope.Eoa)),
    [internalAccountsById],
  );

  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      const internalAccountId = accountGroup.accounts.find((accountId) =>
        getIsAccountSupported(accountId),
      );
      if (internalAccountId) {
        const internalAccount = internalAccountsById[internalAccountId];
        onAccountSelected(internalAccount.address);
        setIsModalVisible(false);
      }
    },
    [getIsAccountSupported, internalAccountsById, onAccountSelected],
  );

  const filteredAccountSections = useMemo(() => {
    if (!accountGroupsByWallet || !internalAccountsById) {
      return undefined;
    }

    return accountGroupsByWallet.reduce<AccountSection[]>((acc, section) => {
      const filteredGroups = section.data.filter((accountGroup) =>
        accountGroup.accounts.some((accountId) =>
          getIsAccountSupported(accountId),
        ),
      );

      if (filteredGroups.length > 0) {
        acc.push({
          title: section.title,
          wallet: section.wallet,
          data: filteredGroups,
        });
      }

      return acc;
    }, []);
  }, [accountGroupsByWallet, internalAccountsById, getIsAccountSupported]);

  const selectedAccountGroup = useMemo(() => {
    if (!selectedAddress) return undefined;

    const internalAccountId = Object.keys(internalAccountsById).find(
      (accountId) =>
        internalAccountsById[accountId].address.toLowerCase() ===
        selectedAddress.toLowerCase(),
    );

    return internalAccountId ? accountToGroupMap[internalAccountId] : undefined;
  }, [selectedAddress, internalAccountsById, accountToGroupMap]);

  const accountName = selectedAccountGroup?.metadata?.name;

  const openModal = useCallback(() => setIsModalVisible(true), []);
  const closeModal = useCallback(() => setIsModalVisible(false), []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={openModal}
        style={styles.row}
        testID={ACCOUNT_SELECTOR_TEST_IDS.PILL}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <View style={styles.valueContainer}>
          {selectedAddress && accountName ? (
            <>
              <Avatar
                variant={AvatarVariant.Account}
                type={accountAvatarType}
                accountAddress={selectedAddress}
                size={AvatarSize.Sm}
              />
              <Text
                variant={TextVariant.BodyMd}
                numberOfLines={1}
                ellipsizeMode="middle"
                twClassName="shrink"
              >
                {accountName}
              </Text>
            </>
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('transaction.recipient_address')}
            </Text>
          )}
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        </View>
      </TouchableOpacity>
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
        testID={ACCOUNT_SELECTOR_TEST_IDS.MODAL}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant={TextVariant.HeadingMd}>
              {strings('bridge.select_recipient')}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Icon
                name={IconName.Close}
                size={IconSize.Md}
                color={theme.colors.icon.default}
              />
            </TouchableOpacity>
          </View>
          <MultichainAccountSelectorList
            selectedAccountGroups={
              selectedAccountGroup ? [selectedAccountGroup] : []
            }
            showFooter={false}
            onSelectAccount={handleSelectAccount}
            accountSections={filteredAccountSections}
            hideAccountCellMenu
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export function AccountSelectorSkeleton() {
  const { styles } = useStyles(stylesheet, {});

  return (
    <View style={styles.container} testID="account-selector-skeleton">
      <View style={styles.row}>
        <Skeleton height={18} width={60} />
        <View style={styles.valueContainer}>
          <Skeleton height={32} width={32} twClassName="rounded-full" />
          <Skeleton height={18} width={120} />
        </View>
      </View>
    </View>
  );
}

export default AccountSelector;
