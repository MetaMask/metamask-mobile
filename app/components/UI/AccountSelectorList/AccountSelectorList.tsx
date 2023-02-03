// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { Alert, ListRenderItem, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import Cell, {
  CellVariants,
} from '../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../component-library/hooks';
import Text from '../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { formatAddress, safeToChecksumAddress } from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { strings } from '../../../../locales/i18n';
import { AvatarVariants } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Account, Assets } from '../../hooks/useAccounts';
import UntypedEngine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';

// Internal dependencies.
import { AccountSelectorListProps } from './AccountSelectorList.types';
import styleSheet from './AccountSelectorList.styles';

const AccountSelectorList = ({
  onSelectAccount,
  onRemoveImportedAccount,
  accounts,
  ensByAccountAddress,
  isLoading = false,
  selectedAddresses,
  isMultiSelect = false,
  renderRightAccessory,
  isSelectionDisabled,
  isRemoveAccountEnabled = false,
  isAutoScrollEnabled = true,
  ...props
}: AccountSelectorListProps) => {
  const Engine = UntypedEngine as any;
  const accountListRef = useRef<any>(null);
  const accountsLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const getKeyExtractor = ({ address }: Account) => address;

  const getTagLabel = (type: KeyringTypes) => {
    let label = '';
    switch (type) {
      case KeyringTypes.qr:
        label = strings('transaction.hardware');
        break;
      case KeyringTypes.simple:
        label = strings('accounts.imported');
        break;
    }
    return label;
  };

  const renderAccountBalances = useCallback(
    ({ fiatBalance, tokens }: Assets) => (
      <View style={styles.balancesContainer}>
        <Text style={styles.balanceLabel}>{fiatBalance}</Text>
        {tokens && <AvatarGroup tokenList={tokens} />}
      </View>
    ),
    [styles.balancesContainer, styles.balanceLabel],
  );

  const onLongPress = useCallback(
    ({
      address,
      imported,
      isSelected,
      index,
    }: {
      address: string;
      imported: boolean;
      isSelected: boolean;
      index: number;
    }) => {
      if (!imported || !isRemoveAccountEnabled) return;
      Alert.alert(
        strings('accounts.remove_account_title'),
        strings('accounts.remove_account_message'),
        [
          {
            text: strings('accounts.no'),
            onPress: () => false,
            style: 'cancel',
          },
          {
            text: strings('accounts.yes_remove_it'),
            onPress: async () => {
              // TODO: Refactor account deletion logic to make more robust.
              const selectedAddressOverride = selectedAddresses?.[0];
              const account = accounts.find(
                ({ isSelected: isAccountSelected, address: accountAddress }) =>
                  selectedAddressOverride
                    ? safeToChecksumAddress(selectedAddressOverride) ===
                      safeToChecksumAddress(accountAddress)
                    : isAccountSelected,
              ) as Account;
              let nextActiveAddress = account?.address;
              if (isSelected) {
                const nextActiveIndex = index === 0 ? 1 : index - 1;
                nextActiveAddress = accounts[nextActiveIndex]?.address;
              }
              // Switching accounts on the PreferencesController must happen before account is removed from the KeyringController, otherwise UI will break.
              // If needed, place PreferencesController.setSelectedAddress in onRemoveImportedAccount callback.
              onRemoveImportedAccount?.({
                removedAddress: address,
                nextActiveAddress,
              });
              await Engine.context.KeyringController.removeAccount(address);
              // Revocation of accounts from PermissionController is needed whenever accounts are removed.
              // If there is an instance where this is not the case, this logic will need to be updated.
              removeAccountsFromPermissions([address]);
            },
          },
        ],
        { cancelable: false },
      );
    },
    /* eslint-disable-next-line */
    [
      accounts,
      onRemoveImportedAccount,
      isRemoveAccountEnabled,
      selectedAddresses,
    ],
  );

  const renderAccountItem: ListRenderItem<Account> = useCallback(
    ({
      item: { name, address, assets, type, isSelected, balanceError },
      index,
    }) => {
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = getTagLabel(type);
      const ensName = ensByAccountAddress[address];
      const accountName =
        isDefaultAccountName(name) && ensName ? ensName : name;
      const isDisabled = !!balanceError || isLoading || isSelectionDisabled;
      const cellVariant = isMultiSelect
        ? CellVariants.Multiselect
        : CellVariants.Select;
      let isSelectedAccount = isSelected;
      if (selectedAddresses) {
        isSelectedAccount = selectedAddresses.includes(address);
      }

      const cellStyle = {
        opacity: isLoading ? 0.5 : 1,
      };

      return (
        <Cell
          onLongPress={() => {
            onLongPress({
              address,
              imported: type === KeyringTypes.simple,
              isSelected: isSelectedAccount,
              index,
            });
          }}
          variant={cellVariant}
          isSelected={isSelectedAccount}
          title={accountName}
          secondaryText={shortAddress}
          tertiaryText={balanceError}
          onPress={() => onSelectAccount?.(address, isSelectedAccount)}
          avatarProps={{
            variant: AvatarVariants.Account,
            type: accountAvatarType,
            accountAddress: address,
          }}
          tagLabel={tagLabel}
          disabled={isDisabled}
          style={cellStyle}
        >
          {renderRightAccessory?.(address, accountName) ||
            (assets && renderAccountBalances(assets))}
        </Cell>
      );
    },
    [
      accountAvatarType,
      onSelectAccount,
      renderAccountBalances,
      ensByAccountAddress,
      isLoading,
      selectedAddresses,
      isMultiSelect,
      renderRightAccessory,
      isSelectionDisabled,
      onLongPress,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accounts.length || !isAutoScrollEnabled) return;
    if (accountsLengthRef.current !== accounts.length) {
      const selectedAddressOverride = selectedAddresses?.[0];
      const account = accounts.find(({ isSelected, address }) =>
        selectedAddressOverride
          ? safeToChecksumAddress(selectedAddressOverride) ===
            safeToChecksumAddress(address)
          : isSelected,
      );
      accountListRef?.current?.scrollToOffset({
        offset: account?.yOffset,
        animated: false,
      });
      accountsLengthRef.current = accounts.length;
    }
  }, [accounts, selectedAddresses, isAutoScrollEnabled]);

  return (
    <FlatList
      ref={accountListRef}
      onContentSizeChange={onContentSizeChanged}
      data={accounts}
      keyExtractor={getKeyExtractor}
      renderItem={renderAccountItem}
      // Increasing number of items at initial render fixes scroll issue.
      initialNumToRender={999}
      {...props}
    />
  );
};

export default AccountSelectorList;
