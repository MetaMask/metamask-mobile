import PropTypes from 'prop-types';
import React, { useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { connect } from 'react-redux';
import { ActivitiesViewSelectorsIDs } from '../../Views/ActivityView/ActivitiesView.testIds';
import { strings } from '../../../../locales/i18n';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../selectors/accountsController';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';
import { baseStyles } from '../../../styles/common';
import Logger from '../../../util/Logger';
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
import {
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerUrlForChain,
  getBlockExplorerName,
  getHexEvmChainId,
} from '../../../util/networks';
import { mockTheme, ThemeContext } from '../../../util/theme';
import PriceChartContext, {
  PriceChartProvider,
} from '../AssetOverview/PriceChart/PriceChart.context';
import TransactionsFooter from './TransactionsFooter';
import { filterDuplicateOutgoingTransactions } from './utils';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
import AssetDetailsActivityListItem from './AssetDetailsActivityListItem';
import ActivityListDateHeader from '../ActivityListItemRow/ActivityListDateHeader';
import {
  getGroupedActivityListItemKey,
  groupActivityListItems,
} from '../../../util/activity-adapters';
import { mapTransactionToActivityItem } from './AssetDetailsActivityListItem.utils';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    listContentContainer: {
      paddingBottom: 80,
    },
    emptyContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      backgroundColor: colors.background.default,
    },
    loader: {
      alignSelf: 'center',
    },
  });

/**
 * View that renders a list of transactions for a specific asset
 */
const Transactions = (props) => {
  const {
    assetSymbol,
    networkConfigurations,
    navigation,
    transactions = [],
    submittedTransactions = [],
    confirmedTransactions = [],
    selectedAddress,
    loading,
    header,
    hideEmptyState,
    chainId,
    onScrollThroughContent,
    tokenChainId,
    contentBottomInset,
    refreshControlOffset,
    accountImportTime,
    groupEvmAccountAddress,
    networkConfigurationsByChainId,
    allTokens,
    bridgeHistory,
  } = props;
  const theme = useContext(ThemeContext) || mockTheme;
  const { colors } = theme;
  const [refreshing, setRefreshing] = useState(false);

  const isExplorerContextNonEvm = isNonEvmChainId(tokenChainId);

  const blockExplorer = useMemo(() => {
    if (!tokenChainId) {
      return undefined;
    }
    return isExplorerContextNonEvm
      ? findBlockExplorerForNonEvmChainId(tokenChainId)
      : findBlockExplorerUrlForChain(tokenChainId, networkConfigurations);
  }, [isExplorerContextNonEvm, networkConfigurations, tokenChainId]);

  const renderLoader = () => {
    const styles = createStyles(colors);
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator style={styles.loader} size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (hideEmptyState) {
      return null;
    }
    const styles = createStyles(colors);
    return (
      <View style={styles.emptyContainer}>
        <TabEmptyState description={strings('wallet.no_transactions')} />
      </View>
    );
  };

  const viewOnBlockExplore = () => {
    try {
      const base =
        blockExplorer ||
        findBlockExplorerUrlForChain(tokenChainId, networkConfigurations);
      if (!base) {
        Logger.error(new Error('Missing block explorer for asset chain'), {
          message: `can't get a block explorer link for network `,
        });
        return;
      }
      const url = `${base}/address/${selectedAddress}`;
      const title = getBlockExplorerName(base);
      trackBlockExplorerLinkClicked(
        analytics.trackEvent,
        AnalyticsEventBuilder.createEventBuilder,
        {
          location: 'transactions_list',
          text: title
            ? `${strings('transactions.view_full_history_on')} ${title}`
            : strings('asset_details.options.view_on_block'),
          url,
        },
      );
      navigation.push('Webview', {
        screen: 'SimpleWebview',
        params: { url, title },
      });
    } catch (e) {
      Logger.error(e, {
        message: `can't get a block explorer link for network `,
      });
    }
  };

  const transactionByActivityItem = new Map();

  const renderGroupedActivityItem = ({ item, index }) => {
    if (item.type === 'pending-header') {
      return <ActivityListDateHeader label={strings('transaction.pending')} />;
    }
    if (item.type === 'date-header') {
      return <ActivityListDateHeader timestamp={item.date} />;
    }
    const tx = transactionByActivityItem.get(item.item);
    return tx ? (
      <AssetDetailsActivityListItem
        transaction={tx}
        index={index}
        assetSymbol={assetSymbol}
        chainId={chainId}
        tokenChainId={tokenChainId}
        navigation={navigation}
        accountImportTime={accountImportTime}
        groupEvmAccountAddress={groupEvmAccountAddress}
        networkConfigurations={networkConfigurationsByChainId}
        allTokens={allTokens}
        bridgeHistory={bridgeHistory}
      />
    ) : null;
  };

  const styles = createStyles(colors);
  const listTransactions =
    submittedTransactions?.length > 0
      ? [...submittedTransactions]
          .sort((a, b) => b.time - a.time)
          .concat(confirmedTransactions)
      : transactions;
  const filteredTransactions =
    filterDuplicateOutgoingTransactions(listTransactions);
  const activityListData = groupActivityListItems(
    filteredTransactions.map((transaction) => {
      const activityItem = mapTransactionToActivityItem({
        transaction,
        assetSymbol,
        currentChainId: chainId,
        tokenChainId,
      });
      transactionByActivityItem.set(activityItem, transaction);
      return activityItem;
    }),
  );
  const footerChainId = getHexEvmChainId(tokenChainId) ?? tokenChainId;

  return (
    <PriceChartProvider>
      <View style={styles.wrapper}>
        {loading ? (
          renderLoader()
        ) : (
          <View style={styles.wrapper}>
            <PriceChartContext.Consumer>
              {({ isChartBeingTouched }) => (
                <FlashList
                  testID={ActivitiesViewSelectorsIDs.CONTAINER}
                  data={activityListData}
                  keyExtractor={getGroupedActivityListItemKey}
                  getItemType={(item) => item.type}
                  refreshControl={
                    <RefreshControl
                      colors={[colors.primary.default]}
                      tintColor={colors.icon.default}
                      progressViewOffset={refreshControlOffset}
                      refreshing={refreshing}
                      onRefresh={async () => {
                        setRefreshing(true);
                        setRefreshing(false);
                      }}
                    />
                  }
                  renderItem={renderGroupedActivityItem}
                  ListHeaderComponent={header}
                  ListFooterComponent={
                    filteredTransactions.length > 0 ? (
                      <TransactionsFooter
                        chainId={footerChainId}
                        rpcBlockExplorer={blockExplorer}
                        isNonEvmChain={isExplorerContextNonEvm}
                        omitGlobalProviderExplorerFallback
                        onViewBlockExplorer={viewOnBlockExplore}
                        showDisclaimer
                      />
                    ) : (
                      renderEmpty()
                    )
                  }
                  contentContainerStyle={[
                    styles.listContentContainer,
                    contentBottomInset !== undefined && {
                      paddingBottom: contentBottomInset,
                    },
                  ]}
                  style={baseStyles.flexGrow}
                  showsVerticalScrollIndicator={false}
                  scrollIndicatorInsets={{ right: 1 }}
                  onScroll={(event) => {
                    onScrollThroughContent?.(event.nativeEvent.contentOffset.y);
                  }}
                  scrollEnabled={!isChartBeingTouched}
                />
              )}
            </PriceChartContext.Consumer>
          </View>
        )}
      </View>
    </PriceChartProvider>
  );
};

Transactions.propTypes = {
  assetSymbol: PropTypes.string,
  /**
   * Network configurations
   */
  networkConfigurations: PropTypes.object,
  /**
    /* navigation object required to push new views
    */
  navigation: PropTypes.object,
  /**
   * An array of transactions objects
   */
  transactions: PropTypes.array,
  /**
   * An array of transactions objects that have been submitted
   */
  submittedTransactions: PropTypes.array,
  /**
   * An array of transactions objects that have been confirmed
   */
  confirmedTransactions: PropTypes.array,
  /**
   * A string that represents the selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Loading flag from an external call
   */
  loading: PropTypes.bool,
  /**
   * Optional header component
   */
  header: PropTypes.object,
  /**
   * When true, suppresses the empty state footer when there are no transactions
   */
  hideEmptyState: PropTypes.bool,
  chainId: PropTypes.string,
  /**
   * On scroll past navbar callback
   */
  onScrollThroughContent: PropTypes.func,
  /**
   * Chain ID of the token
   */
  tokenChainId: PropTypes.string,
  /**
   * (optional) Bottom padding for the list, e.g. to clear a footer floating over it
   */
  contentBottomInset: PropTypes.number,
  /**
   * Moves the pull-to-refresh spinner down, e.g. below a floating header
   */
  refreshControlOffset: PropTypes.number,
  accountImportTime: PropTypes.number,
  groupEvmAccountAddress: PropTypes.string,
  networkConfigurationsByChainId: PropTypes.object,
  allTokens: PropTypes.object,
  bridgeHistory: PropTypes.object,
};

const mapStateToProps = (state, ownProps) => ({
  accountImportTime: selectSelectedInternalAccount(state)?.metadata.importTime,
  groupEvmAccountAddress:
    selectSelectedAccountGroupEvmInternalAccount(state)?.address,
  networkConfigurationsByChainId:
    selectEvmNetworkConfigurationsByChainId(state),
  allTokens: selectAllTokens(state),
  bridgeHistory: selectBridgeHistoryForAccount(state),
  // Token Details carries its own chain and must not react to network switches elsewhere.
  chainId: ownProps.tokenChainId ?? selectChainId(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  networkConfigurations: selectNetworkConfigurations(state),
});

export { Transactions as UnconnectedTransactions, mapStateToProps };

export default connect(mapStateToProps)(Transactions);
