import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Alert,
  InteractionManager,
  View,
  ViewStyle,
  TouchableOpacity,
  ScrollViewProps,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { CaipChainId } from '@metamask/utils';
import { shallowEqual, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { KeyringTypes } from '@metamask/keyring-controller';
import { isAddress as isSolanaAddress } from '@solana/addresses';

import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import {
  areAddressesEqual,
  formatAddress,
  getLabelTextByInternalAccount,
  toFormattedAddress,
} from '../../../util/address';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { isDefaultAccountName } from '../../../util/ENSUtils';
import { strings } from '../../../../locales/i18n';
import { AvatarVariant } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Account, Assets } from '../../hooks/useAccounts';
import Engine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';
import { selectAccountSections } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState1Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

import {
  AccountSection,
  EvmAccountSelectorListProps,
  FlattenedAccountListItem,
} from './EvmAccountSelectorList.types';
import styleSheet from './EvmAccountSelectorList.styles';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { RootState } from '../../../reducers';
import { ACCOUNT_SELECTOR_LIST_TESTID } from './EvmAccountSelectorList.constants';
import { toHex } from '@metamask/controller-utils';
import AccountNetworkIndicator from '../AccountNetworkIndicator';
import { Skeleton } from '../../../component-library/components/Skeleton';
import {
  selectInternalAccounts,
  selectInternalAccountsById,
} from '../../../selectors/accountsController';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';

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
  /**
   * Ref for the FlashList component.
   */
  const accountListRef = useRef<FlashListRef<FlattenedAccountListItem>>(null);
  const accountsLengthRef = useRef<number>(0);
  const { styles } = useStyles(styleSheet, {});

  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Maskicon
        : AvatarAccountType.Maskicon,
    shallowEqual,
  );

  const isMultichainAccountsState1Enabled = useSelector(
    selectMultichainAccountsState1Enabled,
  );
  const accountTreeSections = useSelector(selectAccountSections);

  const internalAccounts = useSelector(selectInternalAccounts);
  const internalAccountsById = useSelector(selectInternalAccountsById);

  const accountSections = useMemo((): AccountSection[] => {
    if (isMultichainAccountsState1Enabled) {
      const accountsById = new Map<string, Account>();
      internalAccounts.forEach((account) => {
        const accountObj = accounts.find((a) => a.id === account.id);
        if (accountObj) {
          accountsById.set(account.id, accountObj);
        }
      });

      // Use AccountTreeController sections and match accounts to their IDs
      return accountTreeSections.map((section) => ({
        title: section.title,
        wallet: section.wallet,
        data: section.data
          .map((accountId: string) => accountsById.get(accountId))
          .filter(
            (account: Account | undefined) => account !== undefined,
          ) as Account[],
      }));
    }
    // Fallback for old behavior
    return accounts.length > 0 ? [{ title: 'Accounts', data: accounts }] : [];
  }, [
    accounts,
    isMultichainAccountsState1Enabled,
    accountTreeSections,
    internalAccounts,
  ]);

  // Flatten sections into a single array for FlatList
  const flattenedData = useMemo((): FlattenedAccountListItem[] => {
    const items: FlattenedAccountListItem[] = [];
    let accountIndex = 0;

    accountSections.forEach((section, sectionIndex) => {
      if (isMultichainAccountsState1Enabled) {
        items.push({
          type: 'header',
          data: section,
          sectionIndex,
        });
      }

      section.data.forEach((account) => {
        items.push({
          type: 'account',
          data: account,
          sectionIndex,
          accountIndex,
        });
        accountIndex++;
      });

      if (
        isMultichainAccountsState1Enabled &&
        sectionIndex < accountSections.length - 1
      ) {
        items.push({
          type: 'footer',
          data: section,
          sectionIndex,
        });
      }
    });

    return items;
  }, [accountSections, isMultichainAccountsState1Enabled]);

  const getKeyExtractor = (item: FlattenedAccountListItem) => {
    if (item.type === 'header') {
      return `header-${item.sectionIndex}`;
    }
    if (item.type === 'footer') {
      return `footer-${item.sectionIndex}`;
    }
    return item.data.address;
  };

  // FlashList optimization: Define item types for better recycling
  const getItemType = useCallback(
    (item: FlattenedAccountListItem) => item.type,
    [],
  );

  const useMultichainAccountDesign = Boolean(isMultichainAccountsState1Enabled);

  const selectedAddressesLookup = useMemo(() => {
    if (!selectedAddresses?.length) return undefined;
    const lookupSet = new Set<string>();
    selectedAddresses.forEach((addr) => {
      if (addr) lookupSet.add(toFormattedAddress(addr));
    });
    return lookupSet;
  }, [selectedAddresses]);

  const renderAccountBalances = useCallback(
    (
      { fiatBalance }: Assets,
      partialAccount: { address: string; scopes: CaipChainId[] },
      isLoadingAccount: boolean,
    ) => {
      const fiatBalanceStrSplit = fiatBalance.split('\n');
      const fiatBalanceAmount = fiatBalanceStrSplit[0] || '';

      return (
        <View
          style={styles.balancesContainer}
          testID={`${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${partialAccount.address}`}
        >
          {isLoadingAccount ? (
            <Skeleton width={60} height={24} />
          ) : (
            <>
              <SensitiveText
                length={SensitiveTextLength.Long}
                style={styles.balanceLabel}
                isHidden={privacyMode}
              >
                {fiatBalanceAmount}
              </SensitiveText>

              <AccountNetworkIndicator partialAccount={partialAccount} />
            </>
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

  const onNavigateToWalletDetails = useCallback(
    (wallet: AccountWalletObject) => {
      navigate(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS, {
        walletId: wallet.id,
      });
    },
    [navigate],
  );

  const renderSectionHeader = useCallback(
    ({ title, wallet }: { title: string; wallet?: AccountWalletObject }) => (
      <View style={styles.sectionHeader}>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={() => wallet && onNavigateToWalletDetails(wallet)}
        >
          <Text variant={TextVariant.BodySM} style={styles.sectionDetailsLink}>
            {strings('multichain_accounts.accounts_list.details')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [
      styles.sectionHeader,
      styles.sectionDetailsLink,
      onNavigateToWalletDetails,
    ],
  );

  const renderSectionFooter = useCallback(
    () => <View style={styles.sectionSeparator} />,
    [styles.sectionSeparator],
  );

  const scrollToSelectedAccount = useCallback(() => {
    if (!accounts.length || !isAutoScrollEnabled || !accountListRef.current)
      return;

    let selectedAccount: Account | undefined;

    if (selectedAddresses?.length) {
      const selectedAddressLower = selectedAddresses[0].toLowerCase();
      selectedAccount = accounts.find(
        (acc) => acc.address.toLowerCase() === selectedAddressLower,
      );
    }

    if (selectedAccount) {
      // Find the item index for the selected account in flattened data
      const selectedItemIndex = flattenedData.findIndex(
        (item) =>
          item.type === 'account' &&
          areAddressesEqual(item.data.address, selectedAccount.address),
      );

      if (selectedItemIndex !== -1) {
        // Use requestAnimationFrame to ensure smooth scrolling
        requestAnimationFrame(() => {
          accountListRef.current?.scrollToIndex({
            index: selectedItemIndex,
            animated: true,
            viewPosition: 0.5, // Center the item in the view
          });
        });
      }
    }
  }, [
    accounts,
    accountListRef,
    selectedAddresses,
    isAutoScrollEnabled,
    flattenedData,
  ]);

  // Scroll to selected account when selection changes or on mount
  useEffect(() => {
    scrollToSelectedAccount();
  }, [scrollToSelectedAccount]);

  const renderItem: ListRenderItem<FlattenedAccountListItem> = useCallback(
    ({ item }) => {
      if (item.type === 'header') {
        return renderSectionHeader(item.data);
      }

      if (item.type === 'footer') {
        return renderSectionFooter();
      }

      // Render account item
      const {
        id,
        name,
        address,
        assets,
        type,
        isSelected,
        balanceError,
        isLoadingAccount,
      } = item.data;

      const internalAccount = internalAccountsById[id];
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = isMultichainAccountsState1Enabled
        ? undefined
        : getLabelTextByInternalAccount(internalAccount);
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
        isSelectedAccount = selectedAddressesLookup.has(
          toFormattedAddress(address),
        );
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
            type === KeyringTypes.simple ||
            (type === KeyringTypes.snap && !isSolanaAddress(address)),
          isSelected: isSelectedAccount,
          index: item.accountIndex,
        });
      };

      const handlePress = () => {
        onSelectAccount?.(address, isSelectedAccount);
      };

      const handleButtonClick = () => {
        if (useMultichainAccountDesign) {
          const account = internalAccount;

          if (!account) return;

          navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS, {
            account,
          });
          return;
        }

        onNavigateToAccountActions(address);
      };

      const buttonProps = {
        onButtonClick: handleButtonClick,
        buttonTestId: WalletViewSelectorsIDs.ACCOUNT_ACTIONS,
      };

      const avatarProps = {
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: address,
      };

      return (
        <Cell
          onLongPress={handleLongPress}
          variant={cellVariant}
          isSelected={isSelectedAccount}
          title={accountName}
          titleProps={{
            style: styles.titleText,
          }}
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
            (assets &&
              renderAccountBalances(assets, item.data, isLoadingAccount))}
        </Cell>
      );
    },
    [
      ensByAccountAddress,
      isLoading,
      isSelectionDisabled,
      isMultiSelect,
      isSelectWithoutMenu,
      selectedAddressesLookup,
      accountAvatarType,
      renderRightAccessory,
      renderAccountBalances,
      onLongPress,
      onSelectAccount,
      useMultichainAccountDesign,
      onNavigateToAccountActions,
      navigate,
      styles.titleText,
      isMultichainAccountsState1Enabled,
      renderSectionHeader,
      renderSectionFooter,
      internalAccountsById,
    ],
  );

  const onContentSizeChanged = useCallback(() => {
    // Handle auto scroll to account
    if (!accounts.length || !isAutoScrollEnabled) return;

    if (accountsLengthRef.current !== accounts.length) {
      let selectedAccount: Account | undefined;

      if (selectedAddresses?.length) {
        const selectedAddress = selectedAddresses[0];
        selectedAccount = accounts.find((acc) =>
          areAddressesEqual(acc.address, selectedAddress),
        );
      }

      // Fall back to the account with isSelected flag if no override or match found
      if (!selectedAccount) {
        selectedAccount = accounts.find((acc) => acc.isSelected);
      }

      accountListRef.current?.scrollToOffset({
        offset: selectedAccount?.yOffset || 0,
        animated: false,
      });

      accountsLengthRef.current = accounts.length;
    }
  }, [accounts, accountListRef, selectedAddresses, isAutoScrollEnabled]);

  return (
    <View style={styles.listContainer}>
      <FlashList
        ref={accountListRef}
        onContentSizeChange={onContentSizeChanged}
        data={flattenedData}
        keyExtractor={getKeyExtractor}
        renderItem={renderItem}
        getItemType={getItemType}
        renderScrollComponent={
          ScrollView as React.ComponentType<ScrollViewProps>
        }
        testID={ACCOUNT_SELECTOR_LIST_TESTID}
        {...props}
      />
    </View>
  );
};

export default React.memo(EvmAccountSelectorList);
