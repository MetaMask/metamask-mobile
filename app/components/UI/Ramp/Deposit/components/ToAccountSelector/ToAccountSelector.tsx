import React, { useCallback, useMemo, useState } from 'react';
import { Modal, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import MultichainAccountSelectorList from '../../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList';
import { AccountSection } from '../../../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.types';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';
import { KnownCaipNamespace } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectInternalAccountsById } from '../../../../../../selectors/accountsController';
import {
  selectAccountToGroupMap,
  selectAccountGroupsByWallet,
} from '../../../../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import stylesheet from './ToAccountSelector.styles';

export const TO_ACCOUNT_SELECTOR_TEST_IDS = {
  PILL: 'to-account-selector-pill',
  BOTTOM_SHEET: 'to-account-selector-bottom-sheet',
};

interface ToAccountSelectorProps {
  chainId?: string;
  selectedAddress?: string;
  onAccountSelected: (address: string) => void;
}

const ToAccountSelector: React.FC<ToAccountSelectorProps> = ({
  chainId,
  selectedAddress,
  onAccountSelected,
}) => {
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const { styles, theme } = useStyles(stylesheet, {});

  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const destScope = chainId ? formatChainIdToCaip(chainId) : '';
  const isDestEvm = destScope.startsWith(KnownCaipNamespace.Eip155);

  const getIsAccountSupported = useCallback(
    (account: AccountId) => {
      if (!destScope) return true;
      const byDestScope =
        internalAccountsById[account]?.scopes.includes(destScope);
      const byEvmWildcard = isDestEvm
        ? internalAccountsById[account]?.scopes.includes(EthScope.Eoa)
        : false;
      return byDestScope || byEvmWildcard;
    },
    [internalAccountsById, destScope, isDestEvm],
  );

  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      const internalAccountId = accountGroup.accounts.find((accountId) =>
        getIsAccountSupported(accountId),
      );
      if (internalAccountId) {
        const internalAccount = internalAccountsById[internalAccountId];
        onAccountSelected(internalAccount.address);
        setIsBottomSheetVisible(false);
      }
    },
    [getIsAccountSupported, internalAccountsById, onAccountSelected],
  );

  const filteredAccountSections = useMemo(() => {
    if (!chainId || !accountGroupsByWallet || !internalAccountsById) {
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
  }, [
    chainId,
    accountGroupsByWallet,
    internalAccountsById,
    getIsAccountSupported,
  ]);

  const selectedAccountGroup = useMemo(() => {
    if (!selectedAddress) return undefined;

    const internalAccountId = Object.keys(internalAccountsById).find(
      (accountId) =>
        internalAccountsById[accountId].address === selectedAddress,
    );

    return internalAccountId ? accountToGroupMap[internalAccountId] : undefined;
  }, [selectedAddress, internalAccountsById, accountToGroupMap]);

  const accountName = selectedAccountGroup?.metadata?.name;

  const openBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={openBottomSheet}
        style={styles.selector}
        testID={TO_ACCOUNT_SELECTOR_TEST_IDS.PILL}
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
              Select recipient
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
        visible={isBottomSheetVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeBottomSheet}
        testID={TO_ACCOUNT_SELECTOR_TEST_IDS.BOTTOM_SHEET}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant={TextVariant.HeadingMD}>Select recipient</Text>
            <TouchableOpacity onPress={closeBottomSheet}>
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
            chainId={chainId}
            hideAccountCellMenu
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default ToAccountSelector;
