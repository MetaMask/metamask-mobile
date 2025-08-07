import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import { useStyles } from '../../../hooks';
import Text, { TextColor, TextVariant } from '../../../components/Texts/Text';
import TextFieldSearch from '../../../components/Form/TextFieldSearch';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState1Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
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

  // TODO: Search state - no search logic implemented yet
  const [searchText, setSearchText] = useState('');

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
            return <AccountListHeader title={item.data.title} />;
          }

          case 'cell': {
            const isSelected = item.data.id === selectedAccountGroup?.id;
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
      [selectedAccountGroup, handleSelectAccount],
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
            {strings('accounts.no_accounts_found')}
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
          placeholder={strings('accounts.search_your_accounts')}
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
          estimatedItemSize={64}
          showsVerticalScrollIndicator={false}
          getItemType={(item) => item.type}
          keyExtractor={keyExtractor}
          {...props}
        />
      </View>
    </>
  );
};

export default MultichainAccountSelectorList;
