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
import { baseStyles } from '../../../styles/common';
import { getAddressUrl } from '../../../core/Multichain/utils';
import { selectNonEvmTransactions } from '../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import styles from './MultichainTransactionsView.styles';
import { useBridgeHistoryItemBySrcTxHash } from '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import MultichainTransactionsFooter from './MultichainTransactionsFooter';
import PriceChartContext, {
  PriceChartProvider,
} from '../../UI/AssetOverview/PriceChart/PriceChart.context';
import MultichainBridgeTransactionListItem from '../../../components/UI/MultichainBridgeTransactionListItem';
import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
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
  chainId: SupportedCaipChainId;
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

const MultichainTransactionsView = ({
  transactions,
  header,
  navigation,
  selectedAddress,
  chainId,
  enableRefresh = false,
  emptyMessage,
  showDisclaimer = false,
  onScroll,
}: MultichainTransactionsViewProps) => {
  const { colors } = useTheme();
  const style = styles(colors);
  const defaultNavigation = useNavigation();
  const nav = navigation ?? defaultNavigation;
  const { namespace } = parseCaipChainId(chainId as CaipChainId);
  const isBitcoinNetwork = namespace === KnownCaipNamespace.Bip122;

  const defaultSelectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const address = selectedAddress ?? defaultSelectedAddress;

  const nonEvmTransactions = useSelector(selectNonEvmTransactions);

  const txList = useMemo(
    () => transactions ?? nonEvmTransactions?.transactions,
    [transactions, nonEvmTransactions],
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
      <TabEmptyState
        description={emptyMessage ?? strings('wallet.no_transactions')}
      />
    </View>
  );

  const url = getAddressUrl(address ?? '', chainId as CaipChainId);

  const footer = (
    <MultichainTransactionsFooter
      url={url}
      hasTransactions={(txList?.length ?? 0) > 0}
      showDisclaimer={showDisclaimer}
      showExplorerLink={!isBitcoinNetwork}
      onViewMore={() => {
        nav.navigate('Webview', {
          screen: 'SimpleWebview',
          params: { url },
        });
      }}
    />
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

    return bridgeHistoryItem ? (
      <MultichainBridgeTransactionListItem
        transaction={item}
        bridgeHistoryItem={bridgeHistoryItem}
        navigation={nav}
        index={index}
      />
    ) : (
      <MultichainTransactionListItem
        transaction={item}
        navigation={nav}
        index={index}
        chainId={chainId}
      />
    );
  };

  return (
    <PriceChartProvider>
      <View style={style.wrapper}>
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <FlashList
              data={txList}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={header}
              ListEmptyComponent={renderEmptyList}
              ListFooterComponent={footer}
              style={baseStyles.flexGrow}
              contentContainerStyle={style.listContentContainer}
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
