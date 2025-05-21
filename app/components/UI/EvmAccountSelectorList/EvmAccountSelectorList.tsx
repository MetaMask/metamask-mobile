// Third party dependencies.
import React, { useCallback, useRef, useMemo } from 'react';
import {
  Alert,
  InteractionManager,
  ListRenderItem,
  View,
  ViewStyle,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { shallowEqual, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../component-library/hooks';
import { TextColor } from '../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { formatAddress, getLabelTextByAddress } from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { strings } from '../../../../locales/i18n';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Account, Assets } from '../../hooks/useAccounts';
import Engine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies.
import { EvmAccountSelectorListProps } from './EvmAccountSelectorList.types';
import styleSheet from './EvmAccountSelectorList.styles';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { RootState } from '../../../reducers';
import { ACCOUNT_SELECTOR_LIST_TESTID } from './EvmAccountSelectorList.constants';
import { toHex } from '@metamask/controller-utils';

/**
 * @deprecated This component is deprecated in favor of the CaipAccountSelectorList component.
 * Functionally they should be nearly identical except that EvmAccountSelectorList expects
 * Hex addressess where as CaipAccountSelectorList expects CaipAccountIds.
 *
 * If changes need to be made to this component, please instead make them to CaipAccountSelectorList
 * and adopt that component instead.
 */
const EvmAccountSelectorList = ({
  onSelectAccount,
  onRemoveImportedAccount,
  accounts,
  ensByAccountAddress,
  isLoading = false,
  selectedAddresses,
  isMultiSelect = false,
  isSelectWithoutMenu = false,
  renderRightAccessory,
  isSelectionDisabled,
  isRemoveAccountEnabled = false,
  isAutoScrollEnabled = true,
  privacyMode = false,
  ...props
}: EvmAccountSelectorListProps) => {
  const { navigate } = useNavigation();
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountListRef = useRef<any>(null);
  const accountsLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});

  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );
  const getKeyExtractor = ({ address }: Account) => address;

  const selectedAddressesLookup = useMemo(() => {
    if (!selectedAddresses?.length) return null;
    const lookupSet = new Set<string>();
    selectedAddresses.forEach((addr) => {
      if (addr) lookupSet.add(addr.toLowerCase());
    });
    return lookupSet;
  }, [selectedAddresses]);

  const renderAccountBalances = useCallback(
    ({ fiatBalance, tokens }: Assets, address: string) => {
      const fiatBalanceStrSplit = fiatBalance.split('\n');
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';
      const tokenTicker = fiatBalanceStrSplit[1] || '';
      return (
        <View
          style={styles.balancesContainer}
          testID={`${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${address}`}
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
      isAccountRemoveable,
      isSelected,
      index,
    }: {
      address: string;
      isAccountRemoveable: boolean;
      isSelected: boolean;
      index: number;
    }) => {
      if (!isAccountRemoveable || !isRemoveAccountEnabled) return;
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
              InteractionManager.runAfterInteractions(async () => {
                // Determine which account should be active after removal
                let nextActiveAddress: string;

                if (isSelected) {
                  // If removing the selected account, choose an adjacent one
                  const nextActiveIndex = index === 0 ? 1 : index - 1;
                  nextActiveAddress = accounts[nextActiveIndex]?.address;
                } else {
                  // Not removing selected account, so keep current selection
                  nextActiveAddress =
                    selectedAddresses?.[0] ||
                    accounts.find((acc) => acc.isSelected)?.address ||
                    '';
                }

                // Switching accounts on the PreferencesController must happen before account is removed from the KeyringController, otherwise UI will break.
                // If needed, place Engine.setSelectedAddress in onRemoveImportedAccount callback.
                onRemoveImportedAccount?.({
                  removedAddress: address,
                  nextActiveAddress,
                });
                // Revocation of accounts from PermissionController is needed whenever accounts are removed.
                // If there is an instance where this is not the case, this logic will need to be updated.
                removeAccountsFromPermissions([toHex(address)]);
                await Engine.context.KeyringController.removeAccount(address);
              });
            },
          },
        ],
        { cancelable: false },
      );
    },
    [
      accounts,
      onRemoveImportedAccount,
      isRemoveAccountEnabled,
      selectedAddresses,
    ],
  );

  const onNavigateToAccountActions = useCallback(
    (selectedAccountAddress: string) => {
      const account = Engine.context.AccountsController.getAccountByAddress(
        selectedAccountAddress,
      );

      if (!account) return;

      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ACCOUNT_ACTIONS,
        params: { selectedAccount: account },
      });
    },
    [navigate],
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
      let cellVariant = CellVariant.SelectWithMenu;
      if (isMultiSelect) {
        cellVariant = CellVariant.MultiSelect;
      }
      if (isSelectWithoutMenu) {
        cellVariant = CellVariant.Select;
      }
      let isSelectedAccount = isSelected;
      if (selectedAddressesLookup) {
        isSelectedAccount = selectedAddressesLookup.has(address.toLowerCase());
      }

      const cellStyle: ViewStyle = {
        opacity: isLoading ? 0.5 : 1,
      };
      if (!isMultiSelect) {
        cellStyle.alignItems = 'center';
      }

      const handleLongPress = () => {
        onLongPress({
          address,
          isAccountRemoveable:
            type === KeyringTypes.simple || type === KeyringTypes.snap,
          isSelected: isSelectedAccount,
          index,
        });
      };

      const handlePress = () => {
        onSelectAccount?.(address, isSelectedAccount);
      };

      const handleButtonClick = () => {
        onNavigateToAccountActions(address);
      };

      const buttonProps = {
        onButtonClick: handleButtonClick,
        buttonTestId: `${WalletViewSelectorsIDs.ACCOUNT_ACTIONS}-${index}`,
      };

      const avatarProps = {
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: address,
      };

      return (
        <Cell
          key={address}
          onLongPress={handleLongPress}
          variant={cellVariant}
          isSelected={isSelectedAccount}
          title={accountName}
          secondaryText={shortAddress}
          showSecondaryTextIcon={false}
          tertiaryText={balanceError}
          onPress={handlePress}
          avatarProps={avatarProps}
          tagLabel={tagLabel}
          disabled={isDisabled}
          style={cellStyle}
          buttonProps={buttonProps}
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
      selectedAddressesLookup,
      isMultiSelect,
      isSelectWithoutMenu,
      renderRightAccessory,
      isSelectionDisabled,
      onLongPress,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accounts.length || !isAutoScrollEnabled) return;
    if (accountsLengthRef.current !== accounts.length) {
      let selectedAccount: Account | undefined;

      if (selectedAddresses?.length) {
        const selectedAddressLower = selectedAddresses[0].toLowerCase();
        selectedAccount = accounts.find(
          (acc) => acc.address.toLowerCase() === selectedAddressLower,
        );
      }
      // Fall back to the account with isSelected flag if no override or match found
      if (!selectedAccount) {
        selectedAccount = accounts.find((acc) => acc.isSelected);
      }

      accountListRef?.current?.scrollToOffset({
        offset: selectedAccount?.yOffset,
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
      testID={ACCOUNT_SELECTOR_LIST_TESTID}
      {...props}
    />
  );
};

export default React.memo(EvmAccountSelectorList);
