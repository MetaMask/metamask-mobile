import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Transaction } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { selectSolanaAccountTransactions } from '../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import { baseStyles } from '../../../styles/common';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const MultichainTransactionsView = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const solanaAccountTransactions = useSelector(
    selectSolanaAccountTransactions,
  );

  useEffect(() => {
    setLoading(true);

    // use the selector selectSolanaAccountTransactions
    // simple timeout to simulate loading
    const timer = setTimeout(() => {
      // check if solanaAccountTransactions is an object with transactions property
      if (
        solanaAccountTransactions &&
        'transactions' in solanaAccountTransactions
      ) {
        setTransactions(solanaAccountTransactions.transactions);
      } else {
        setTransactions([]);
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [solanaAccountTransactions]);

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.text.default }]}>
        {strings('wallet.no_transactions')}
      </Text>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <MultichainTransactionListItem
      transaction={item}
      selectedAddress={selectedAddress || ''}
      navigation={navigation}
    />
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={colors.primary.default}
          testID={`transactions-loading-indicator`}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyList}
        style={baseStyles.flexGrow}
      />
    </View>
  );
};

export default MultichainTransactionsView;
