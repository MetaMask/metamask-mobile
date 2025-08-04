import React, { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import { useStyles } from '../../../hooks';
import Text, { TextColor, TextVariant } from '../../../components/Texts/Text';
import AccountCell from '../AccountCell';
import TextFieldSearch from '../../../components/Form/TextFieldSearch';
import { selectAccountGroupsByWallet } from '../../../../multichain-accounts/selectors/accountTreeController';

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

const MultichainAccountSelectorList = ({
  onSelectAccount,
  selectedAccountGroup,
  testID = MULTICHAIN_ACCOUNT_SELECTOR_LIST_TESTID,
  listRef,
  ...props
}: MultichainAccountSelectorListProps) => {
  const { styles } = useStyles(createStyles, {});
  const accountSections = useSelector(selectAccountGroupsByWallet);

  // TODO: Search state - no search logic implemented yet
  const [searchText, setSearchText] = useState('');

  const walletSections = useMemo((): WalletSection[] => {
    if (!accountSections || accountSections.length === 0) {
      return [];
    }

    return accountSections.map((section) => ({
      title: section.title,
      data: section.data,
      walletName: section.title,
    }));
  }, [accountSections]);

  const flattenedData = useMemo((): FlattenedMultichainAccountListItem[] => {
    if (walletSections.length === 0) {
      return [];
    }

    const items: FlattenedMultichainAccountListItem[] = [];

    walletSections.forEach((section) => {
      items.push({
        type: 'header',
        data: { title: section.title, walletName: section.walletName },
      });

      section.data.forEach((accountGroup) => {
        items.push({
          type: 'account',
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
  }, [walletSections]);

  // Handle account selection with debouncing to prevent rapid successive calls
  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      // Prevent multiple rapid calls for the same account
      if (selectedAccountGroup?.id === accountGroup.id) return;
      onSelectAccount?.(accountGroup);
    },
    [onSelectAccount, selectedAccountGroup?.id],
  );

  const renderItem: ListRenderItem<FlattenedMultichainAccountListItem> =
    useCallback(
      ({ item }) => {
        switch (item.type) {
          case 'header': {
            return (
              <View style={styles.sectionHeader}>
                <Text
                  variant={TextVariant.BodyMDBold}
                  color={TextColor.Alternative}
                  style={styles.sectionHeaderText}
                >
                  {item.data.title}
                </Text>
              </View>
            );
          }

          case 'account': {
            const isSelected = item.data.id === selectedAccountGroup?.id;
            return (
              <TouchableOpacity
                style={styles.accountItem}
                onPress={() => handleSelectAccount(item.data)}
                activeOpacity={0.7}
              >
                <AccountCell accountGroup={item.data} isSelected={isSelected} />
              </TouchableOpacity>
            );
          }

          case 'footer': {
            return <View style={styles.footerSpacing} />;
          }

          default:
            return null;
        }
      },
      [
        styles.sectionHeader,
        styles.sectionHeaderText,
        styles.accountItem,
        styles.footerSpacing,
        selectedAccountGroup,
        handleSelectAccount,
      ],
    );

  if (flattenedData.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View
          style={styles.emptyState}
          testID={MULTICHAIN_ACCOUNT_SELECTOR_EMPTY_STATE_TESTID}
        >
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.emptyStateText}
          >
            No accounts found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search accounts..."
          testID={MULTICHAIN_ACCOUNT_SELECTOR_SEARCH_INPUT_TESTID}
          autoFocus={false}
          style={styles.searchTextField}
        />
      </View>
      <View style={styles.listContainer} testID={testID}>
        <FlashList
          ref={listRef}
          data={flattenedData}
          renderItem={renderItem}
          estimatedItemSize={70}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item, index) => {
            switch (item.type) {
              case 'header':
                return `header-${item.data.walletName}`;
              case 'account':
                return `account-${item.data.id}`;
              case 'footer':
                return `footer-${item.data.walletName}`;
              default:
                return `item-${index}`;
            }
          }}
          {...props}
        />
      </View>
    </>
  );
};

export default MultichainAccountSelectorList;
