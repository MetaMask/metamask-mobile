import React, {
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  InteractionManager,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
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
import { Account } from '../../hooks/useAccounts';
import Engine from '../../../core/Engine';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';
import { selectAccountSections } from '../../../multichain-accounts/selectors/accountTreeController';

import {
  AccountSection,
  EvmAccountSelectorListProps,
  FlattenedAccountListItem,
} from './EvmAccountSelectorList.types';
import styleSheet from './EvmAccountSelectorList.styles';
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
import { AccountWallet } from '@metamask/account-tree-controller';
import { getAggregatedBalance } from '../../hooks/useMultichainBalances/utils';
import { renderFiat } from '../../../util/number';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import {
  getMultichainNetworkAggregatedBalance,
  selectMultichainBalances,
  selectMultichainAssetsRates,
  selectMultichainAssets,
} from '../../../selectors/multichain';
import { SolAccountType } from '@metamask/keyring-api';
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';

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
   * Ref for the FlatList component.
   * The type of the ref is not explicitly defined.
   */
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

  const accountTreeSections = useSelector(selectAccountSections);
  const internalAccounts = useSelector(selectInternalAccounts);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainAssets = useSelector(selectMultichainAssets);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const nonEvmNetworkChainId = useSelector(selectSelectedNonEvmNetworkChainId);

  const [aggregatedBalanceByAccount, setAggregatedBalanceByAccount] = useState<{
    [address: string]: number | null;
  }>({});

  const internalAccountsById = useSelector(selectInternalAccountsById);

  const accountSections = useMemo((): AccountSection[] => {
    if (accountTreeSections) {
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
          .filter((account): account is Account => account !== undefined),
      }));
    }
    // Fallback for old behavior
    return accounts.length > 0 ? [{ title: 'Accounts', data: accounts }] : [];
  }, [accounts, accountTreeSections, internalAccounts]);

  // Flatten sections into a single array for FlatList
  const flattenedData = useMemo((): FlattenedAccountListItem[] => {
    const items: FlattenedAccountListItem[] = [];
    let accountIndex = 0;

    accountSections.forEach((section, sectionIndex) => {
      if (accountTreeSections) {
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

      if (accountTreeSections && sectionIndex < accountSections.length - 1) {
        items.push({
          type: 'footer',
          data: section,
          sectionIndex,
        });
      }
    });

    return items;
  }, [accountSections, accountTreeSections]);

  const getKeyExtractor = (item: FlattenedAccountListItem) => {
    if (item.type === 'header') {
      return `header-${item.sectionIndex}`;
    }
    if (item.type === 'footer') {
      return `footer-${item.sectionIndex}`;
    }
    return item.data.address;
  };

  const useMultichainAccountDesign = Boolean(accountTreeSections);

  const selectedAddressesLookup = useMemo(() => {
    if (!selectedAddresses?.length) return undefined;
    const lookupSet = new Set<string>();
    selectedAddresses.forEach((addr) => {
      if (addr) lookupSet.add(toFormattedAddress(addr));
    });
    return lookupSet;
  }, [selectedAddresses]);

  const renderAccountBalances = useCallback(
    (address: string, item: FlattenedAccountListItem & { type: 'account' }) => (
      <View
        style={styles.balancesContainer}
        testID={`${AccountListBottomSheetSelectorsIDs.ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID}-${address}`}
      >
        {aggregatedBalanceByAccount[address] !== null &&
        aggregatedBalanceByAccount[address] !== undefined ? (
          <>
            <SensitiveText
              length={SensitiveTextLength.Long}
              style={styles.balanceLabel}
              isHidden={privacyMode}
            >
              {renderFiat(
                aggregatedBalanceByAccount[address] as number,
                currentCurrency,
                2,
              )}
            </SensitiveText>
            <AccountNetworkIndicator partialAccount={item.data} />
          </>
        ) : (
          <Skeleton width={60} height={24} />
        )}
      </View>
    ),
    [
      aggregatedBalanceByAccount,
      privacyMode,
      currentCurrency,
      styles.balancesContainer,
      styles.balanceLabel,
    ],
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
    (wallet: AccountWallet) => {
      navigate(Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS, {
        walletId: wallet.id,
      });
    },
    [navigate],
  );

  const renderSectionHeader = useCallback(
    ({ title, wallet }: { title: string; wallet?: AccountWallet }) => (
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
        accountListRef.current?.scrollToIndex({
          index: selectedItemIndex,
          animated: true,
          viewPosition: 0.5, // Center the item in the view
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

  // Async function to fetch and update aggregated balances
  const fetchAggregatedBalances = useCallback(async (): Promise<void> => {
    if (!internalAccounts.length) return;

    try {
      const aggregatedBalanceNewState: {
        [address: string]: number | null;
      } = {};

      // Initialize all accounts with null to show loading state
      internalAccounts.forEach((account) => {
        aggregatedBalanceNewState[toFormattedAddress(account.address)] = null;
      });

      // Update state immediately to show loading state
      setAggregatedBalanceByAccount(aggregatedBalanceNewState);

      // Process each account and get their balance
      for (const account of internalAccounts) {
        try {
          if (account.type === SolAccountType.DataAccount) {
            const balanceData = getMultichainNetworkAggregatedBalance(
              account,
              multichainBalances,
              multichainAssets,
              multichainAssetsRates,
              nonEvmNetworkChainId,
            );

            const totalBalance =
              (balanceData?.totalBalanceFiat || 0) +
              (Number(balanceData?.totalNativeTokenBalance?.amount) || 0);

            aggregatedBalanceNewState[toFormattedAddress(account.address)] =
              totalBalance;
          } else {
            const balanceData = getAggregatedBalance(account);
            const totalBalance =
              (balanceData?.ethFiat || 0) + (balanceData?.tokenFiat || 0);

            aggregatedBalanceNewState[toFormattedAddress(account.address)] =
              totalBalance;

            // Update state incrementally for better UX
            setAggregatedBalanceByAccount((prev) => ({
              ...prev,
              [toFormattedAddress(account.address)]: totalBalance,
            }));
          }
        } catch (error) {
          console.error(
            `Error fetching balance for account ${account.address}:`,
            error,
          );
          // Keep null for failed accounts
        }
      }
    } catch (error) {
      console.error('Error in fetchAggregatedBalances:', error);
    }
  }, [internalAccounts]);

  // Fetch aggregated balances when internal accounts change
  useEffect(() => {
    fetchAggregatedBalances();
  }, [fetchAggregatedBalances]);

  const renderItem = useCallback(
    ({ item }: { item: FlattenedAccountListItem }) => {
      if (item.type === 'header') {
        return renderSectionHeader(item.data);
      }
      if (item.type === 'footer') {
        return renderSectionFooter();
      }
      // Only for account items
      const { id, name, address, type, isSelected, balanceError } = item.data;

      const internalAccount = internalAccountsById[id];
      const shortAddress = formatAddress(address, 'short');
      const tagLabel = accountTreeSections
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
          key={address}
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
            renderAccountBalances(
              address,
              item as typeof item & { type: 'account' },
            )}
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
      onLongPress,
      onSelectAccount,
      useMultichainAccountDesign,
      onNavigateToAccountActions,
      navigate,
      styles.titleText,
      accountTreeSections,
      renderSectionHeader,
      renderSectionFooter,
      internalAccountsById,
      renderAccountBalances,
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
    <FlatList
      ref={accountListRef}
      onContentSizeChange={onContentSizeChanged}
      data={flattenedData}
      keyExtractor={getKeyExtractor}
      renderItem={renderItem}
      // Increasing number of items at initial render fixes scroll issue.
      initialNumToRender={flattenedData.length} // Using the optimal number of items.
      testID={ACCOUNT_SELECTOR_LIST_TESTID}
      {...props}
    />
  );
};

export default React.memo(EvmAccountSelectorList);
