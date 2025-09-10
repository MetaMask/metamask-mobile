import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { View, ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { selectEVMEnabledNetworks } from '../../../../selectors/networkEnablementController';

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
import { useTokenBalancesUpdate } from '../../../../components/hooks/useTokenBalancesUpdate';
import {
  MULTICHAIN_ACCOUNT_SELECTOR_LIST_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID,
  MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID,
} from './MultichainAccountSelectorList.constants';
import { strings } from '../../../../../locales/i18n';
import { selectAvatarAccountType } from '../../../../selectors/settings';

const MultichainAccountSelectorList = ({
  onSelectAccount,
  selectedAccountGroups,
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
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [lastCreatedAccountId, setLastCreatedAccountId] = useState<
    string | null
  >(null);
  const internalListRef = useRef(null);
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
      walletId: section.wallet.id,
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
        data: { walletName: section.walletName, walletId: section.walletId },
      });
    });

    return items;
  }, [filteredWalletSections]);

  // Reset scroll to top when search text changes
  useEffect(() => {
    if (listRefToUse.current) {
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

  useTokenBalancesUpdate(enabledEvmNetworks);

  // Scroll to the first selected account whenever selection or data changes
  useEffect(() => {
    if (debouncedSearchText.trim()) return;
    if (!listRefToUse.current) return;
    if (!selectedAccountGroups?.length) return;

    const targetId = selectedAccountGroups[0]?.id;
    if (!targetId) return;

    const index = flattenedData.findIndex(
      (item) => item.type === 'cell' && item.data.id === targetId,
    );

    if (index !== -1) {
      const raf = requestAnimationFrame(() => {
        listRefToUse.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [selectedAccountGroups, flattenedData, debouncedSearchText, listRefToUse]);

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

  const renderItem: ListRenderItem<FlattenedMultichainAccountListItem> =
    useCallback(
      ({ item }) => {
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
              />
            );
          }

          case 'footer': {
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
        avatarAccountType,
      ],
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
            {...props}
          />
        )}
      </View>
    </>
  );
};

export default React.memo(MultichainAccountSelectorList);
