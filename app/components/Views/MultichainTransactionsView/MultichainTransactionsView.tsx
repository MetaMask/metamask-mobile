import React, { useMemo } from 'react';
import {
  View,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, NavigationProp } from '@react-navigation/native';
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
import { useBridgeHistoryItemBySrcTxHash } from '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import PriceChartContext, {
  PriceChartProvider,
} from '../../UI/AssetOverview/PriceChart/PriceChart.context';

interface MultichainTransactionsViewProps {
  /**
   * Override transactions instead of using selector
   */
  transactions?: Transaction[];
  /**
   * Optional header component
   */
  header?: React.ReactElement;
  /**
   * Override navigation instance
   */
  navigation?: NavigationProp<Record<string, object | undefined>>;
  /**
   * Override selected address
   */
  selectedAddress?: string;
  /**
   * Chain ID for block explorer links
   */
  chainId?: string;
  /**
   * Enable refresh functionality
   */
  enableRefresh?: boolean;
  /**
   * Custom empty message
   */
  emptyMessage?: string;
  /**
   * Show disclaimer footer
   */
  showDisclaimer?: boolean;
  /**
   * Scroll event handler
   */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const MultichainTransactionsView: React.FC<MultichainTransactionsViewProps> = ({
  transactions: transactionsProp,
  header,
  navigation: navigationProp,
  selectedAddress: selectedAddressProp,
  chainId: chainIdProp,
  enableRefresh = false,
  emptyMessage,
  showDisclaimer = false,
  onScroll,
}) => {
  const { colors } = useTheme();
  const style = styles(colors);
  const defaultNavigation = useNavigation();
  const navigation = navigationProp || defaultNavigation;

  const defaultSelectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const selectedAddress = selectedAddressProp || defaultSelectedAddress;

  const solanaAccountTransactions = useSelector(
    selectSolanaAccountTransactions,
  );

  const transactions = useMemo(
    () => transactionsProp || solanaAccountTransactions?.transactions,
    [transactionsProp, solanaAccountTransactions],
  );

  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    if (!enableRefresh) return;

    setRefreshing(true);
    try {
      await updateIncomingTransactions();
    } catch (error) {
      console.warn('Error refreshing transactions:', error);
    } finally {
      setRefreshing(false);
    }
  }, [enableRefresh]);

  const renderEmptyList = () => (
    <View style={style.emptyContainer}>
      <Text style={[style.emptyText, { color: colors.text.default }]}>
        {emptyMessage || strings('wallet.no_transactions')}
      </Text>
    </View>
  );

  const renderViewMore = () => {
    const chainId =
      chainIdProp ||
      nonEvmNetworkChainIdByAccountAddress(selectedAddress || '');
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

  const renderDisclaimer = () => {
    if (!showDisclaimer) return null;

    return (
      <View style={style.disclaimerWrapper}>
        <Text style={style.disclaimerText}>
          {strings('asset_overview.disclaimer')}
        </Text>
      </View>
    );
  };

  const renderFooter = () => (
    <View>
      {transactions?.length > 0 ? renderViewMore() : null}
      {renderDisclaimer()}
    </View>
  );

  const renderTransactionItem = ({
    item,
    index,
  }: {
    item: Transaction;
    index: number;
  }) => {
    const srcTxHash = item.id;
    const bridgeHistoryItem = bridgeHistoryItemsBySrcTxHash[srcTxHash];

    return (
      <MultichainTransactionListItem
        transaction={item}
        bridgeHistoryItem={bridgeHistoryItem}
        selectedAddress={selectedAddress || ''}
        navigation={navigation}
        index={index}
      />
    );
  };

  return (
    <PriceChartProvider>
      <View style={style.wrapper}>
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <FlashList
              data={transactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={header}
              ListEmptyComponent={renderEmptyList}
              ListFooterComponent={renderFooter}
              style={baseStyles.flexGrow}
              estimatedItemSize={200}
              refreshControl={
                enableRefresh ? (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary.default]}
                    tintColor={colors.icon.default}
                  />
                ) : undefined
              }
              onScroll={onScroll}
              scrollEnabled={!isChartBeingTouched}
            />
          )}
        </PriceChartContext.Consumer>
      </View>
    </PriceChartProvider>
  );
};

export default MultichainTransactionsView;
