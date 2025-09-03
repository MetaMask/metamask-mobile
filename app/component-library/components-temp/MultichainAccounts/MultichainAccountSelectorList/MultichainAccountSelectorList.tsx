import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import { useStyles } from '../../../hooks';
import Text, { TextColor, TextVariant } from '../../../components/Texts/Text';
import TextFieldSearch from '../../../components/Form/TextFieldSearch';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState1Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
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

const MultichainAccountSelectorList = ({
  onSelectAccount,
  selectedAccountGroup,
  testID = MULTICHAIN_ACCOUNT_SELECTOR_LIST_TESTID,
  listRef,
  ...props
}: MultichainAccountSelectorListProps) => {
  const { styles } = useStyles(createStyles, {});
  const isMultichainAccountsEnabled = useSelector(
    selectMultichainAccountsState1Enabled,
  );
  const accountSections = useSelector(selectAccountGroupsByWallet);
  const internalAccountsById = useSelector(selectInternalAccountsById);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

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
    if (
      !isMultichainAccountsEnabled ||
      !accountSections ||
      accountSections.length === 0
    ) {
      return [];
    }

    return accountSections.map((section) => ({
      title: section.title,
      data: section.data,
      walletName: section.title,
    }));
  }, [isMultichainAccountsEnabled, accountSections]);

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
    if (filteredWalletSections.length === 0) {
      return [];
    }

    const items: FlattenedMultichainAccountListItem[] = [];

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
        data: { walletName: section.walletName },
      });
    });

    return items;
  }, [filteredWalletSections]);

  // Handle account selection with debouncing to prevent rapid successive calls
  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      // Prevent multiple rapid calls for the same account
      if (selectedAccountGroup.id === accountGroup.id) return;
      onSelectAccount?.(accountGroup);
    },
    [onSelectAccount, selectedAccountGroup.id],
  );

  const renderItem: ListRenderItem<FlattenedMultichainAccountListItem> =
    useCallback(
      ({ item }) => {
        switch (item.type) {
          case 'header': {
            return <AccountListHeader title={item.data.title} />;
          }

          case 'cell': {
            const isSelected = item.data.id === selectedAccountGroup.id;
            return (
              <AccountListCell
                accountGroup={item.data}
                isSelected={isSelected}
                onSelectAccount={handleSelectAccount}
              />
            );
          }

          case 'footer': {
            return <AccountListFooter />;
          }

          default:
            return null;
        }
      },
      [selectedAccountGroup.id, handleSelectAccount],
    );

  const keyExtractor = useCallback(
    (item: FlattenedMultichainAccountListItem, index: number) => {
      switch (item.type) {
        case 'header':
          return `header-${item.data.walletName}`;
        case 'cell':
          return `account-${item.data.id}`;
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

  const flashListKey = useMemo(
    () => `flashlist-${debouncedSearchText}-${flattenedData.length}`,
    [debouncedSearchText, flattenedData.length],
  );

  return (
    <>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchText}
          onChangeText={setSearchText}
          placeholder={strings('accounts.search_your_accounts')}
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
            key={flashListKey}
            ref={listRef}
            data={flattenedData}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            getItemType={getItemType}
            keyExtractor={keyExtractor}
            {...props}
          />
        )}
      </View>
    </>
  );
};

export default React.memo(MultichainAccountSelectorList);
