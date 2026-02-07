import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { View, ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, ListRenderItem, FlashListRef } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import { useStyles } from '../../../hooks';
import Text, { TextColor, TextVariant } from '../../../components/Texts/Text';
import TextFieldSearch from '../../../components/Form/TextFieldSearch';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import AccountListHeader from './AccountListHeader';
import AccountListCell from './AccountListCell';
import AccountListFooter from './AccountListFooter';

import {
  MultichainAccountSelectorListProps,
  FlattenedMultichainAccountListItem,
  WalletSection,
} from './MultichainAccountSelectorList.types';
import createStyles from './MultichainAccountSelectorList.styles';
import {
  MULTICHAIN_ACCOUNT_SELECTOR_LIST_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
} from './MultichainAccountSelectorList.constants';
import { strings } from '../../../../../locales/i18n';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import ExternalAccountCell from './ExternalAccountCell';

const MultichainAccountSelectorList = ({
  onSelectAccount,
  selectedAccountGroups,
  testID = MULTICHAIN_ACCOUNT_SELECTOR_LIST_TESTID,
  listRef,
  showCheckbox = false,
  showFooter = true,
  setKeyboardAvoidingViewEnabled,
  accountSections: accountSectionsProp,
  chainId,
  hideAccountCellMenu = false,
  showExternalAccountOnEmptySearch = false,
  onSelectExternalAccount,
  selectedExternalAddress,
  ...props
}: MultichainAccountSelectorListProps) => {
  const { styles } = useStyles(createStyles, {});
  const accountSectionsFromSelector = useSelector(selectAccountGroupsByWallet);
  const accountSections = accountSectionsProp || accountSectionsFromSelector;
  const internalAccountsById = useSelector(selectInternalAccountsById);

  const [searchText, setSearchText] = useState(selectedExternalAddress || '');
  const [debouncedSearchText, setDebouncedSearchText] = useState(
    selectedExternalAddress || '',
  );
  const [lastCreatedAccountId, setLastCreatedAccountId] = useState<
    string | null
  >(null);
  const internalListRef =
    useRef<FlashListRef<FlattenedMultichainAccountListItem>>(null);
  const listRefToUse = listRef || internalListRef;

  const selectedIdSet = useMemo(
    () => new Set(selectedAccountGroups.map((g) => g.id)),
    [selectedAccountGroups],
  );

  const avatarAccountType = useSelector(selectAvatarAccountType);

  // Debounce search text with 200ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchText]);

  const matchesSearch = useCallback(
    (accountGroup: AccountGroupObject, searchQuery: string): boolean => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();

      if (accountGroup.metadata.name.toLowerCase().includes(query)) {
        return true;
      }

      return accountGroup.accounts.some((accountId) => {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount) return false;

        return internalAccount.address.toLowerCase().includes(query);
      });
    },
    [internalAccountsById],
  );

  const walletSections = useMemo((): WalletSection[] => {
    if (!accountSections || accountSections.length === 0) {
      return [];
    }

    return accountSections.map((section) => ({
      title: section.title,
      data: section.data,
      walletName: section.title,
      walletId: section.wallet.id,
    }));
  }, [accountSections]);

  const filteredWalletSections = useMemo((): WalletSection[] => {
    if (!debouncedSearchText.trim()) {
      return walletSections;
    }

    return walletSections
      .map((section) => ({
        ...section,
        data: section.data.filter((accountGroup) =>
          matchesSearch(accountGroup, debouncedSearchText),
        ),
      }))
      .filter((section) => section.data.length > 0);
  }, [walletSections, debouncedSearchText, matchesSearch]);

  const flattenedData = useMemo((): FlattenedMultichainAccountListItem[] => {
    const items: FlattenedMultichainAccountListItem[] = [];

    if (filteredWalletSections.length === 0) {
      if (showExternalAccountOnEmptySearch) {
        const address = debouncedSearchText.trim();
        items.push({
          type: 'external',
          data: { address },
        });
      }
      return items;
    }

    filteredWalletSections.forEach((section) => {
      items.push({
        type: 'header',
        data: { title: section.title, walletName: section.walletName },
      });

      section.data.forEach((accountGroup) => {
        items.push({
          type: 'cell',
          data: accountGroup,
          walletName: section.walletName,
        });
      });

      items.push({
        type: 'footer',
        data: { walletName: section.walletName, walletId: section.walletId },
      });
    });

    return items;
  }, [
    filteredWalletSections,
    debouncedSearchText,
    showExternalAccountOnEmptySearch,
  ]);

  // Track if we've done the initial scroll to selected item
  const hasScrolledToSelected = useRef(false);

  // Scroll to selected item on initial mount
  useEffect(() => {
    if (
      !hasScrolledToSelected.current &&
      listRefToUse.current &&
      flattenedData.length > 0
    ) {
      const targetId = selectedAccountGroups?.[0]?.id;
      if (targetId) {
        const idx = flattenedData.findIndex(
          (item) => item.type === 'cell' && item.data.id === targetId,
        );
        if (idx >= 0) {
          const frameId = requestAnimationFrame(() => {
            listRefToUse.current?.scrollToIndex({
              index: idx,
              animated: false,
              viewPosition: 0.5,
            });
          });
          hasScrolledToSelected.current = true;
          return () => cancelAnimationFrame(frameId);
        }
      }
      hasScrolledToSelected.current = true;
    }
  }, [flattenedData, selectedAccountGroups, listRefToUse]);

  // Reset scroll to top when search text changes
  useEffect(() => {
    if (listRefToUse.current) {
      hasScrolledToSelected.current = false;
      // Use requestAnimationFrame to ensure the list has finished re-rendering
      const animationFrameId = requestAnimationFrame(() => {
        listRefToUse.current?.scrollToOffset({ offset: 0, animated: false });
      });

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [debouncedSearchText, listRefToUse]);

  // Listen for account creation and scroll to new account
  useEffect(() => {
    if (lastCreatedAccountId && listRefToUse.current) {
      // Find the index of the newly created account
      const newAccountIndex = flattenedData.findIndex(
        (item) => item.type === 'cell' && item.data.id === lastCreatedAccountId,
      );

      if (newAccountIndex !== -1) {
        listRefToUse.current?.scrollToIndex({
          index: newAccountIndex,
          animated: true,
          viewPosition: 0.5, // Center the item in the visible area
        });
      }

      setLastCreatedAccountId(null);
    }
  }, [lastCreatedAccountId, flattenedData, listRefToUse]);

  // Enable keyboard avoiding view when list has 2 or fewer items
  useEffect(() => {
    if (setKeyboardAvoidingViewEnabled) {
      const accountCellsCount = flattenedData.filter(
        (item) => item.type === 'cell',
      ).length;

      setKeyboardAvoidingViewEnabled(accountCellsCount <= 2);
    }
  }, [flattenedData, setKeyboardAvoidingViewEnabled]);
  // Handle account creation callback
  const handleAccountCreated = useCallback((newAccountId: string) => {
    setLastCreatedAccountId(newAccountId);
  }, []);

  // Handle account selection/deselection toggle
  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      onSelectAccount?.(accountGroup);
    },
    [onSelectAccount],
  );

  const handleSelectExternalAccount = useCallback(
    (address: string) => {
      onSelectExternalAccount?.(address);
    },
    [onSelectExternalAccount],
  );

  const renderItem: ListRenderItem<FlattenedMultichainAccountListItem> =
    useCallback(
      ({ item }: { item: FlattenedMultichainAccountListItem }) => {
        switch (item.type) {
          case 'header': {
            return <AccountListHeader title={item.data.title} />;
          }

          case 'cell': {
            const isSelected = selectedIdSet.has(item.data.id);
            return (
              <AccountListCell
                accountGroup={item.data}
                avatarAccountType={avatarAccountType}
                isSelected={isSelected}
                onSelectAccount={handleSelectAccount}
                showCheckbox={showCheckbox}
                chainId={chainId}
                hideMenu={hideAccountCellMenu}
              />
            );
          }

          case 'external': {
            const isSelected = selectedExternalAddress
              ? item.data.address.toLowerCase() ===
                selectedExternalAddress.toLowerCase()
              : false;
            return (
              <ExternalAccountCell
                address={item.data.address}
                onPress={() => handleSelectExternalAccount(item.data.address)}
                chainId={chainId}
                isSelected={isSelected}
              />
            );
          }

          case 'footer': {
            if (!showFooter) return null;
            return (
              <AccountListFooter
                walletId={item.data.walletId}
                onAccountCreated={handleAccountCreated}
              />
            );
          }

          default:
            return null;
        }
      },
      [
        selectedIdSet,
        handleSelectAccount,
        handleAccountCreated,
        handleSelectExternalAccount,
        avatarAccountType,
        showCheckbox,
        showFooter,
        chainId,
        hideAccountCellMenu,
        selectedExternalAddress,
      ],
    );

  const keyExtractor = useCallback(
    (item: FlattenedMultichainAccountListItem, index: number) => {
      switch (item.type) {
        case 'header':
          return `header-${item.data.walletName}`;
        case 'cell':
          return `account-${item.data.id}`;
        case 'external':
          return `external-${item.data.address}`;
        case 'footer':
          return `footer-${item.data.walletName}`;
        default:
          return `item-${index}`;
      }
    },
    [],
  );

  const getItemType = useCallback(
    (item: FlattenedMultichainAccountListItem) => item.type,
    [],
  );

  const emptyStateText = useMemo(
    () =>
      debouncedSearchText.trim()
        ? strings('accounts.no_accounts_found_for_search')
        : strings('accounts.no_accounts_found'),
    [debouncedSearchText],
  );

  return (
    <>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchText}
          onChangeText={setSearchText}
          placeholder={strings('accounts.search_your_accounts')}
          placeholderTextColor={styles.searchPlaceholderText.color}
          testID={MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID}
          autoFocus={false}
          style={styles.searchTextField}
        />
      </View>
      <View style={styles.listContainer} testID={testID}>
        {flattenedData.length === 0 ? (
          <View
            style={styles.emptyState}
            testID={MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID}
          >
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.emptyStateText}
            >
              {emptyStateText}
            </Text>
          </View>
        ) : (
          <FlashList
            ref={listRefToUse}
            data={flattenedData}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            getItemType={getItemType}
            keyExtractor={keyExtractor}
            renderScrollComponent={
              ScrollView as React.ComponentType<ScrollViewProps>
            }
            // Performance optimizations
            removeClippedSubviews
            {...props}
          />
        )}
      </View>
    </>
  );
};

export default React.memo(MultichainAccountSelectorList);
