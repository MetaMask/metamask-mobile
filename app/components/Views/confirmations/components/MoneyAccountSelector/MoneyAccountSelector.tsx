import React, { useCallback, useMemo, useState } from 'react';
import { Modal, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';
import { useSelector } from 'react-redux';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
import stylesheet from './MoneyAccountSelector.styles';

export const MONEY_ACCOUNT_SELECTOR_TEST_IDS = {
  PILL: 'money-account-selector-pill',
  MODAL: 'money-account-selector-modal',
};

export interface MoneyAccountSelectorProps {
  selectedAddress?: string;
  onAccountSelected: (address: string) => void;
}

const MoneyAccountSelector: React.FC<MoneyAccountSelectorProps> = ({
  selectedAddress,
  onAccountSelected,
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
        internalAccountsById[accountId].address === selectedAddress,
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
        style={styles.selector}
        testID={MONEY_ACCOUNT_SELECTOR_TEST_IDS.PILL}
      >
        {selectedAddress && accountName ? (
          <>
            <Avatar
              variant={AvatarVariant.Account}
              type={accountAvatarType}
              accountAddress={selectedAddress}
              size={AvatarSize.Sm}
            />
            <Text
              variant={TextVariant.BodyMD}
              numberOfLines={1}
              ellipsizeMode="middle"
              style={styles.accountText}
            >
              {accountName}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={theme.colors.icon.alternative}
            />
          </>
        ) : (
          <>
            <Text variant={TextVariant.BodyMD} style={styles.placeholderText}>
              {strings('transaction.recipient_address')}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={theme.colors.icon.alternative}
            />
          </>
        )}
      </TouchableOpacity>
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
        testID={MONEY_ACCOUNT_SELECTOR_TEST_IDS.MODAL}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant={TextVariant.HeadingMD}>
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

export default MoneyAccountSelector;
