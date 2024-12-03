// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { Alert, ListRenderItem, View, ViewStyle } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import { selectInternalAccounts } from '../../../selectors/accountsController';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { InternalAccount } from '@metamask/keyring-api';
import { useStyles } from '../../../component-library/hooks';
import { TextColor } from '../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import {
  formatAddress,
  getLabelTextByAddress,
  safeToChecksumAddress,
} from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { strings } from '../../../../locales/i18n';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Account, Assets } from '../../hooks/useAccounts';
import UntypedEngine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies.
import { AccountSelectorListProps } from './AccountSelectorList.types';
import styleSheet from './AccountSelectorList.styles';
import { AccountListViewSelectorsIDs } from '../../../../e2e/selectors/AccountListView.selectors';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

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
  privacyMode = false,
  ...props
}: AccountSelectorListProps) => {
  const { navigate } = useNavigation();
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountListRef = useRef<any>(null);
  const accountsLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const internalAccounts = useSelector(selectInternalAccounts);
  const getKeyExtractor = ({ address }: Account) => address;

  const renderAccountBalances = useCallback(
    ({ fiatBalance, tokens }: Assets, address: string) => {
      const fiatBalanceStrSplit = fiatBalance.split('\n');
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';
      const tokenTicker = fiatBalanceStrSplit[1] || '';
      return (
        <View
          style={styles.balancesContainer}
          testID={`${AccountListViewSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${address}`}
        >
          <SensitiveText
            length={SensitiveTextLength.Long}
            style={styles.balanceLabel}
            isHidden={privacyMode}
          >
            {fiatBalanceAmount}
          </SensitiveText>
          <SensitiveText
            length={SensitiveTextLength.Short}
            style={styles.balanceLabel}
            isHidden={privacyMode}
            color={privacyMode ? TextColor.Alternative : TextColor.Default}
          >
            {tokenTicker}
          </SensitiveText>
          {tokens && (
            <AvatarGroup
              avatarPropsList={tokens.map((tokenObj) => ({
                ...tokenObj,
                variant: AvatarVariant.Token,
              }))}
            />
          )}
        </View>
      );
    },
    [styles.balancesContainer, styles.balanceLabel, privacyMode],
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
              // If needed, place Engine.setSelectedAddress in onRemoveImportedAccount callback.
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

  const onNavigateToAccountActions = useCallback(
    (selectedAccount: string) => {
      const account = internalAccounts.find(
        (accountData: InternalAccount) =>
          accountData.address.toLowerCase() === selectedAccount.toLowerCase(),
      );

      if (!account) return;

      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ACCOUNT_ACTIONS,
        params: { selectedAccount: account },
      });
    },
    [navigate, internalAccounts],
  );

  const renderAccountItem: ListRenderItem<Account> = useCallback(
    ({
      item: { name, address, assets, type, isSelected, balanceError },
      index,
    }) => {
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = getLabelTextByAddress(address);
      const ensName = ensByAccountAddress[address];
      const accountName =
        isDefaultAccountName(name) && ensName ? ensName : name;
      const isDisabled = !!balanceError || isLoading || isSelectionDisabled;
      const cellVariant = isMultiSelect
        ? CellVariant.MultiSelect
        : CellVariant.SelectWithMenu;
      let isSelectedAccount = isSelected;
      if (selectedAddresses) {
        const lowercasedSelectedAddresses = selectedAddresses.map(
          (selectedAddress: string) => selectedAddress.toLowerCase(),
        );
        isSelectedAccount = lowercasedSelectedAddresses.includes(
          address.toLowerCase(),
        );
      }

      const cellStyle: ViewStyle = {
        opacity: isLoading ? 0.5 : 1,
      };
      if (!isMultiSelect) {
        cellStyle.alignItems = 'center';
      }

      return (
        <Cell
          key={address}
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
          showSecondaryTextIcon={false}
          tertiaryText={balanceError}
          onPress={() => onSelectAccount?.(address, isSelectedAccount)}
          avatarProps={{
            variant: AvatarVariant.Account,
            type: accountAvatarType,
            accountAddress: address,
          }}
          tagLabel={tagLabel}
          disabled={isDisabled}
          style={cellStyle}
          buttonProps={{
            onButtonClick: () => onNavigateToAccountActions(address),
            buttonTestId: `${WalletViewSelectorsIDs.ACCOUNT_ACTIONS}-${index}`,
          }}
        >
          {renderRightAccessory?.(address, accountName) ||
            (assets && renderAccountBalances(assets, address))}
        </Cell>
      );
    },
    [
      onNavigateToAccountActions,
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
