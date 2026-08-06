import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, StyleProp, View, ViewStyle } from 'react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';
import { useSelector } from 'react-redux';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  KeyValueSelect,
  KeyValueSelectVariant,
  TextColor,
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
import { KeyValueRowSkeleton } from '../rows/key-value-row-skeleton';

export const ACCOUNT_SELECTOR_TEST_IDS = {
  PILL: 'account-selector-pill',
  MODAL: 'account-selector-modal',
  /** Used when `BottomSheet` is mocked in unit tests (production sheet has no wrapper testID). */
  BOTTOM_SHEET: 'account-selector-bottom-sheet',
};

export interface AccountSelectorProps {
  selectedAddress?: string;
  onAccountSelected: (address: string) => void;
  /** Label shown on the left side of the row. Defaults to the "To" i18n string. */
  label?: string;
  /** Title in the account selection bottom sheet (header). */
  selectorTitle?: string;
  style?: StyleProp<ViewStyle>;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedAddress,
  onAccountSelected,
  label = strings('confirm.label.to'),
  selectorTitle = strings('bridge.select_recipient'),
  style,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(stylesheet, {});

  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const getIsAccountSupported = useCallback(
    (account: AccountId) =>
      Boolean(internalAccountsById[account]?.scopes.includes(EthScope.Eoa)),
    [internalAccountsById],
  );

  const openModal = useCallback(() => setIsModalVisible(true), []);

  const closeAccountSheet = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleModalRequestClose = useCallback(() => {
    closeAccountSheet();
  }, [closeAccountSheet]);

  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      const internalAccountId = accountGroup.accounts.find((accountId) =>
        getIsAccountSupported(accountId),
      );
      if (internalAccountId) {
        const internalAccount = internalAccountsById[internalAccountId];
        onAccountSelected(internalAccount.address);
        closeAccountSheet();
      }
    },
    [
      closeAccountSheet,
      getIsAccountSupported,
      internalAccountsById,
      onAccountSelected,
    ],
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

  const displayLabel = useMemo(() => {
    if (
      !filteredAccountSections ||
      filteredAccountSections.length <= 1 ||
      !selectedAccountGroup
    ) {
      return label;
    }

    const walletName = filteredAccountSections
      .find((section) =>
        section.data.some((group) => group.id === selectedAccountGroup.id),
      )
      ?.title?.replace(/ accounts$/iu, '');

    return walletName ? `${label} ${walletName}` : label;
  }, [filteredAccountSections, selectedAccountGroup, label]);

  return (
    <>
      <KeyValueSelect
        testID={ACCOUNT_SELECTOR_TEST_IDS.PILL}
        variant={KeyValueSelectVariant.Summary}
        keyLabel={displayLabel}
        keyTextProps={{
          color: TextColor.TextAlternative,
        }}
        value={selectedAddress && accountName ? accountName : undefined}
        valueStartAccessory={
          selectedAddress && accountName ? (
            <Avatar
              variant={AvatarVariant.Account}
              type={accountAvatarType}
              accountAddress={selectedAddress}
              size={AvatarSize.Sm}
            />
          ) : undefined
        }
        onPress={openModal}
        style={style}
        selectButtonProps={{
          placeholder: strings('transaction.recipient_address'),
        }}
      />
      <Modal
        visible={isModalVisible}
        animationType="none"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={handleModalRequestClose}
        testID={ACCOUNT_SELECTOR_TEST_IDS.MODAL}
      >
        <View style={styles.modalRoot}>
          <BottomSheet
            testID={ACCOUNT_SELECTOR_TEST_IDS.BOTTOM_SHEET}
            ref={bottomSheetRef}
            isFullscreen
            keyboardAvoidingViewEnabled={false}
            onClose={handleSheetClosed}
          >
            <BottomSheetHeader onClose={() => closeAccountSheet()}>
              {selectorTitle}
            </BottomSheetHeader>
            <View style={styles.modalSheetBody}>
              <MultichainAccountSelectorList
                selectedAccountGroups={
                  selectedAccountGroup ? [selectedAccountGroup] : []
                }
                showFooter={false}
                onSelectAccount={handleSelectAccount}
                accountSections={filteredAccountSections}
                hideAccountCellMenu
              />
            </View>
          </BottomSheet>
        </View>
      </Modal>
    </>
  );
};

export function AccountSelectorSkeleton() {
  return <KeyValueRowSkeleton testID="account-selector-skeleton" />;
}

export default AccountSelector;
