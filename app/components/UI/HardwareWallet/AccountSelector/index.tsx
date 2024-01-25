import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import CheckBox from '@react-native-community/checkbox';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { IAccount } from './types';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import { useAccountsBalance } from './hooks';
import { useTheme } from '../../../../util/theme';
import { createStyle } from './styles';
import AccountDetails from '../AccountDetails';
import StyledButton from '../../../UI/StyledButton';
import { selectProviderConfig } from '../../../../selectors/networkController';

interface ISelectQRAccountsProps {
  accounts: IAccount[];
  selectedAccounts: string[];
  nextPage: () => void;
  prevPage: () => void;
  toggleAccount: (index: number) => void;
  onUnlock: (accountIndex: number[]) => void;
  onForget: () => void;
  title: string;
}

const AccountSelector = (props: ISelectQRAccountsProps) => {
  const {
    accounts,
    prevPage,
    nextPage,
    toggleAccount,
    selectedAccounts,
    onForget,
    onUnlock,
    title,
  } = props;

  const { colors } = useTheme();
  const styles = createStyle(colors);
  const providerConfig = useSelector(selectProviderConfig);
  const accountsBalance = useAccountsBalance(accounts);
  const { toBlockExplorer } = useBlockExplorer();

  const [checkedAccounts, setCheckedAccounts] = useState<Set<number>>(
    new Set(),
  );

  const formattedAccounts: IAccount[] = useMemo(() => {
    const selectedAccountsSet = new Set<string>(
      selectedAccounts.map((address) => address.toLowerCase()),
    );
    return accounts.map((account) => {
      const checked = checkedAccounts.has(account.index);
      const selected = selectedAccountsSet.has(account.address.toLowerCase());
      return {
        ...account,
        checked: checked || selected,
        exist: selected,
        balance: accountsBalance[account.address]?.balance || '0x0',
      };
    });
  }, [accounts, checkedAccounts, selectedAccounts, accountsBalance]);

  const onCheckBoxClick = useCallback(
    (index: number) => {
      setCheckedAccounts((prev: Set<number>) => {
        prev.has(index) ? prev.delete(index) : prev.add(index);
        return new Set(prev);
      });
      toggleAccount(index);
    },
    [toggleAccount],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={formattedAccounts}
        keyExtractor={(item) => `address-${item.index}`}
        renderItem={({ item }) => (
          <View style={[styles.account]}>
            <CheckBox
              style={[styles.checkBox]}
              disabled={item.exist}
              value={item.checked}
              onValueChange={() => onCheckBoxClick(item.index)}
              boxType={'square'}
              tintColors={{
                true: colors.primary.default,
                false: colors.border.default,
              }}
              onCheckColor={colors.background.default}
              onFillColor={colors.primary.default}
              onTintColor={colors.primary.default}
            />
            <AccountDetails
              index={item.index}
              address={item.address}
              balance={item.balance}
              ticker={providerConfig.ticker}
              toBlockExplorer={toBlockExplorer}
            />
          </View>
        )}
      />
      <View style={styles.pagination}>
        <TouchableOpacity style={styles.paginationItem} onPress={prevPage}>
          <Icon name={'chevron-left'} color={colors.primary.default} />
          <Text style={styles.paginationText}>
            {strings('account_selector.prev')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.paginationItem} onPress={nextPage}>
          <Text style={styles.paginationText}>
            {strings('account_selector.next')}
          </Text>
          <Icon name={'chevron-right'} color={colors.primary.default} />
        </TouchableOpacity>
      </View>
      <View style={styles.bottom}>
        <StyledButton
          type={'confirm'}
          onPress={() => onUnlock([...checkedAccounts])}
          containerStyle={[styles.button]}
          disabled={checkedAccounts.size < 1}
        >
          {strings('account_selector.unlock')}
        </StyledButton>
        <StyledButton
          type={'transparent-blue'}
          onPress={onForget}
          containerStyle={[styles.button]}
        >
          {strings('account_selector.forget')}
        </StyledButton>
      </View>
    </View>
  );
};

export default AccountSelector;
