import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { CaipChainId, Transaction } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import { baseStyles } from '../../../styles/common';
import {
  getAddressUrl,
  nonEvmNetworkChainIdByAccountAddress,
} from '../../../core/Multichain/utils';
import { selectSolanaAccountTransactions } from '../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import { getBlockExplorerName } from '../../../util/networks';
import styles from './MultichainTransactionsView.styles';

const MultichainTransactionsView = () => {
  const { colors } = useTheme();
  const style = styles(colors);
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const [loading, setLoading] = useState(true);
  const solanaAccountTransactions = useSelector(
    selectSolanaAccountTransactions,
  );

  const transactions = useMemo(() => {
    if (
      solanaAccountTransactions &&
      'transactions' in solanaAccountTransactions
    ) {
      return solanaAccountTransactions.transactions;
    }
    return [];
  }, [solanaAccountTransactions]);

  useEffect(() => {
    // if it has already been set to false, don't re-run the effect
    if (loading === false) return;
    // simple timeout to simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [loading, solanaAccountTransactions]);

  const renderEmptyList = () => (
    <View style={style.emptyContainer}>
      <Text style={[style.emptyText, { color: colors.text.default }]}>
        {strings('wallet.no_transactions')}
      </Text>
    </View>
  );

  const renderViewMore = () => {
    const chainId = nonEvmNetworkChainIdByAccountAddress(selectedAddress || '');
    const url = getAddressUrl(selectedAddress || '', chainId as CaipChainId);

    return (
      <View style={style.viewMoreWrapper}>
        <Button
          variant={ButtonVariants.Link}
          size={ButtonSize.Lg}
          label={`${strings(
            'transactions.view_full_history_on',
          )} ${getBlockExplorerName(url)}`}
          style={style.viewMoreButton}
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
      <View style={style.loader}>
        <ActivityIndicator
          size="large"
          color={colors.primary.default}
          testID={`transactions-loading-indicator`}
        />
      </View>
    );
  }

  return (
    <View style={style.wrapper}>
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
