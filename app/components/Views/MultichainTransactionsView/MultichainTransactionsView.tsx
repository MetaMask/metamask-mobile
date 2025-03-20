import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { CaipChainId, Transaction } from '@metamask/keyring-api';
import { ThemeColors } from '@metamask/design-tokens';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { fontStyles, baseStyles } from '../../../styles/common';
import {
  getAddressUrl,
  nonEvmNetworkChainIdByAccountAddress,
} from '../../../core/Multichain/utils';
import { selectSolanaAccountTransactions } from '../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import { getBlockExplorerName } from '../../../util/networks';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      fontSize: 20,
      color: colors.text.muted,
      ...fontStyles.normal,
    },
    viewMoreWrapper: {
      padding: 16,
    },
    viewMoreButton: {
      width: '100%',
    },
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const MultichainTransactionsView = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

  const renderViewMore = () => {
    const chainId = nonEvmNetworkChainIdByAccountAddress(selectedAddress || '');
    const url = getAddressUrl(selectedAddress || '', chainId as CaipChainId);

    return (
      <View style={styles.viewMoreWrapper}>
        <Button
          variant={ButtonVariants.Link}
          size={ButtonSize.Lg}
          label={`${strings(
            'transactions.view_full_history_on',
          )} ${getBlockExplorerName(url)}`}
          style={styles.viewMoreButton}
          onPress={() => {
            navigation.navigate('Webview', {
              screen: 'SimpleWebview',
              params: { url },
            });
          }}
        />
      </View>
    );
  };

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
      <FlashList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyList}
        style={baseStyles.flexGrow}
        ListFooterComponent={transactions.length > 0 ? renderViewMore() : null}
        estimatedItemSize={200}
      />
    </View>
  );
};

export default MultichainTransactionsView;
