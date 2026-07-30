import { providerErrors } from '@metamask/rpc-errors';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/transaction-controller';
import PropTypes from 'prop-types';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { connect } from 'react-redux';
import { ActivitiesViewSelectorsIDs } from '../../Views/ActivityView/ActivitiesView.testIds';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { NO_RPC_BLOCK_EXPLORER, RPC } from '../../../constants/network';
import Engine from '../../../core/Engine';
import ToastService from '../../../core/ToastService/ToastService';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import NotificationManager from '../../../core/NotificationManager';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { collectibleContractsSelector } from '../../../reducers/collectibles';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectGasFeeControllerEstimateType } from '../../../selectors/gasFeeController';
import {
  selectChainId,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectProviderConfig,
  selectProviderType,
} from '../../../selectors/networkController';
import { selectPrimaryCurrency } from '../../../selectors/settings';
import { baseStyles, fontStyles } from '../../../styles/common';
import { isHardwareAccount } from '../../../util/address';
import Logger from '../../../util/Logger';
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
import {
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerForRpc,
  findBlockExplorerUrlForChain,
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
  getHexEvmChainId,
} from '../../../util/networks';
import { mockTheme, ThemeContext } from '../../../util/theme';
import {
  getPreviousGasFromController,
  speedUpTransaction as speedUpTransactionController,
} from '../../../util/transaction-controller';
import {
  getGasValuesForReplacement,
  getMediumGasPriceHex,
  normalizeReplacementGasFeeParams,
} from '../../../util/confirmation/gas';
import { validateTransactionActionBalance } from '../../../util/transactions';
import {
  createQRSigningTransactionModalNavDetails,
  QRSignMode,
} from '../../UI/QRHardware/QRSigningTransactionModal';
import { CancelSpeedupModal } from '../../Views/confirmations/components/modals/cancel-speedup-modal';
import PriceChartContext, {
  PriceChartProvider,
} from '../AssetOverview/PriceChart/PriceChart.context';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import TransactionElement from '../TransactionElement';
import TransactionsFooter from './TransactionsFooter';
import { filterDuplicateOutgoingTransactions } from './utils';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
import {
  useHardwareWallet,
  executeHardwareWalletOperation,
} from '../../../core/HardwareWallet';
import { getTransactionUpdateErrorToastOptions } from '../../../util/confirmation/transactions';
import { LedgerReplacementTxTypes } from '../LedgerModals/LedgerTransactionModal';
import { selectIsActivityRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';
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
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    emptyContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      backgroundColor: colors.background.default,
    },
    keyboardAwareWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    loader: {
      alignSelf: 'center',
    },
    textTransactions: {
      fontSize: 20,
      color: colors.text.muted,
      textAlign: 'center',
      marginLeft: 6,
      marginRight: 6,
      ...fontStyles.normal,
    },
  });

const DEFAULT_HARDWARE_WALLET = {
  ensureDeviceReady: async () => false,
  setPendingOperationAddress: () => undefined,
  showAwaitingConfirmation: () => undefined,
  hideAwaitingConfirmation: () => undefined,
  showHardwareWalletError: () => undefined,
};

/**
 * View that renders a list of transactions for a specific asset
 */
const Transactions = (props) => {
  const {
    assetSymbol,
    accounts,
    close,
    networkConfigurations,
    navigation,
    providerConfig = {},
    collectibleContracts,
    transactions = [],
    submittedTransactions = [],
    confirmedTransactions = [],
    selectedAddress,
    currentCurrency,
    loading,
    onRefSet,
    header,
    hideEmptyState,
    headerHeight = 0,
    exchangeRate,
    isSigningQRObject,
    chainId,
    onScrollThroughContent,
    gasFeeEstimates,
    tokenChainId,
    skipScrollOnClick,
    location,
    hardwareWallet = DEFAULT_HARDWARE_WALLET,
    isActivityRedesignEnabled,
  } = props;
  const theme = useContext(ThemeContext) || mockTheme;
  const { colors } = theme;
  const [selectedTransactions, setSelectedTransactions] = useState(new Map());
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelIsOpen, setCancelIsOpen] = useState(false);
  const [speedUpIsOpen, setSpeedUpIsOpen] = useState(false);
  const [confirmDisabled, setConfirmDisabled] = useState(false);
  const [rpcBlockExplorer, setRpcBlockExplorer] = useState();
  const [isQRHardwareAccount, setIsQRHardwareAccount] = useState(false);
  const [isLedgerAccount, setIsLedgerAccount] = useState(false);
  const mountedRef = useRef(false);
  const existingTxRef = useRef(null);
  const cancelTxIdRef = useRef(null);
  const speedUpTxIdRef = useRef(null);
  const selectedTxRef = useRef(null);
  const scrollingRef = useRef(false);
  const flatListRef = useRef(null);
  const latestMountPropsRef = useRef({ transactions, onRefSet });
  const notificationTimeoutRef = useRef(null);
  const toggleDetailsViewRef = useRef(null);

  const explorerContextChainId =
    location === TransactionDetailLocation.AssetDetails
      ? tokenChainId
      : (tokenChainId ?? chainId);
  const isAssetDetailsExplorer =
    location === TransactionDetailLocation.AssetDetails;
  const isExplorerContextNonEvm = isNonEvmChainId(explorerContextChainId);

  const closeSpeedUpCancelModal = useCallback(() => {
    setSpeedUpIsOpen(false);
    setCancelIsOpen(false);
    speedUpTxIdRef.current = null;
    cancelTxIdRef.current = null;
    existingTxRef.current = null;
  }, []);

  const updateBlockExplorer = useCallback(() => {
    const { type, rpcUrl } = providerConfig;
    const useAssetOnlyExplorer =
      isAssetDetailsExplorer || Boolean(tokenChainId);
    let blockExplorer;

    if (!explorerContextChainId && useAssetOnlyExplorer) {
      blockExplorer = undefined;
    } else if (isExplorerContextNonEvm) {
      blockExplorer = findBlockExplorerForNonEvmChainId(explorerContextChainId);
    } else if (useAssetOnlyExplorer) {
      blockExplorer = findBlockExplorerUrlForChain(
        explorerContextChainId,
        networkConfigurations,
      );
    } else if (type === RPC) {
      blockExplorer =
        findBlockExplorerForRpc(rpcUrl, networkConfigurations) ||
        NO_RPC_BLOCK_EXPLORER;
    }

    setRpcBlockExplorer(blockExplorer);
    setIsQRHardwareAccount(
      isHardwareAccount(selectedAddress, [ExtendedKeyringTypes.qr]),
    );
    setIsLedgerAccount(
      isHardwareAccount(selectedAddress, [ExtendedKeyringTypes.ledger]),
    );
  }, [
    explorerContextChainId,
    isAssetDetailsExplorer,
    isExplorerContextNonEvm,
    networkConfigurations,
    providerConfig,
    selectedAddress,
    tokenChainId,
  ]);

  const scrollToIndex = useCallback(
    (index) => {
      if (!scrollingRef.current && (headerHeight || index)) {
        scrollingRef.current = true;
        flatListRef.current?.scrollToIndex({ index, animated: true });
        setTimeout(() => {
          scrollingRef.current = false;
        }, 300);
      }
    },
    [headerHeight],
  );

  const toggleDetailsView = useCallback(
    (id, index) => {
      const selectedTx = selectedTxRef.current;
      const oldId = selectedTx?.id;
      const oldIndex = selectedTx?.index;

      if (selectedTx && oldId !== id && oldIndex !== index) {
        selectedTxRef.current = null;
        toggleDetailsViewRef.current?.(oldId, oldIndex);
        InteractionManager.runAfterInteractions(() => {
          toggleDetailsViewRef.current?.(id, index);
        });
        return;
      }

      setSelectedTransactions((currentSelectedTransactions) => {
        const nextSelectedTransactions = new Map(currentSelectedTransactions);
        const show = !nextSelectedTransactions.get(id);
        nextSelectedTransactions.set(id, show);
        if (show && (headerHeight || index) && !skipScrollOnClick) {
          InteractionManager.runAfterInteractions(() => {
            scrollToIndex(index);
          });
        }
        selectedTxRef.current = show ? { id, index } : null;
        return nextSelectedTransactions;
      });
    },
    [headerHeight, scrollToIndex, skipScrollOnClick],
  );
  toggleDetailsViewRef.current = toggleDetailsView;

  useEffect(() => {
    latestMountPropsRef.current = { transactions, onRefSet };
  }, [onRefSet, transactions]);

  useEffect(() => {
    mountedRef.current = true;
    const timeout = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }
      setReady(true);
      const txToView = NotificationManager.getTransactionToView();
      if (txToView) {
        notificationTimeoutRef.current = setTimeout(() => {
          const { transactions: latestTransactions } =
            latestMountPropsRef.current;
          const index = latestTransactions.findIndex(
            (tx) => txToView === tx.id,
          );
          if (index >= 0) {
            toggleDetailsViewRef.current?.(txToView, index);
          }
        }, 1000);
      }
      latestMountPropsRef.current.onRefSet?.(flatListRef);
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateBlockExplorer();
  }, [updateBlockExplorer]);

  useEffect(() => {
    if (
      confirmedTransactions.some(({ id }) => id === existingTxRef.current?.id)
    ) {
      closeSpeedUpCancelModal();
    }
  }, [closeSpeedUpCancelModal, confirmedTransactions]);

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
    const { type } = providerConfig;
    const useAssetOnlyExplorer =
      isAssetDetailsExplorer || Boolean(tokenChainId);
    try {
      let url;
      let title;
      if (useAssetOnlyExplorer) {
        const base =
          rpcBlockExplorer && rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER
            ? rpcBlockExplorer
            : findBlockExplorerUrlForChain(
                explorerContextChainId,
                networkConfigurations,
              );
        if (!base) {
          throw new Error('Missing block explorer for asset chain');
        }
        url = `${base}/address/${selectedAddress}`;
        title = getBlockExplorerName(base);
      } else if (isExplorerContextNonEvm && rpcBlockExplorer) {
        url = `${rpcBlockExplorer}/address/${selectedAddress}`;
        title = getBlockExplorerName(rpcBlockExplorer);
      } else {
        const result = getBlockExplorerAddressUrl(
          type,
          selectedAddress,
          rpcBlockExplorer,
        );
        url = result.url;
        title = result.title;
      }
      if (!url) {
        throw new Error('Missing block explorer URL');
      }
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
      close?.();
    } catch (e) {
      Logger.error(e, {
        message: `can't get a block explorer link for network `,
        type,
      });
    }
  };

  const getCancelOrSpeedupValues = useCallback(() => {
    const existingGasPriceHex = existingTxRef.current?.txParams?.gasPrice;
    if (existingGasPriceHex !== undefined && existingGasPriceHex !== '0x0') {
      if (parseInt(String(existingGasPriceHex), 16) !== 0) {
        return undefined;
      }
    }
    return { gasPrice: getMediumGasPriceHex(gasFeeEstimates) };
  }, [gasFeeEstimates]);

  const getParamsToSend = useCallback(
    (transactionObject) => {
      if (
        transactionObject?.gasPrice !== undefined &&
        (transactionObject.gasPrice === '0x0' ||
          parseInt(String(transactionObject.gasPrice), 16) === 0)
      ) {
        return getCancelOrSpeedupValues();
      }
      if (
        transactionObject &&
        (transactionObject.maxFeePerGas || transactionObject.gasPrice)
      ) {
        return transactionObject;
      }
      return getCancelOrSpeedupValues();
    },
    [getCancelOrSpeedupValues],
  );

  const showTransactionUpdateErrorToast = (error) => {
    ToastService.showToast(getTransactionUpdateErrorToastOptions(error));
  };

  const handleSpeedUpTransactionFailure = (error) => {
    Logger.error(error, {
      message: `speedUpTransaction failed `,
      speedUpTxId: speedUpTxIdRef.current,
    });
    InteractionManager.runAfterInteractions(() => {
      showTransactionUpdateErrorToast(error);
    });
    setSpeedUpIsOpen(false);
    setCancelIsOpen(false);
  };

  const handleCancelTransactionFailure = (error) => {
    Logger.error(error, {
      message: `cancelTransaction failed `,
      cancelTxId: cancelTxIdRef.current,
    });
    InteractionManager.runAfterInteractions(() => {
      showTransactionUpdateErrorToast(error);
    });
    setSpeedUpIsOpen(false);
    setCancelIsOpen(false);
  };

  const signLedgerTransaction = async (transaction) => {
    if (!selectedAddress) {
      throw new Error('Missing selected address for hardware wallet operation');
    }
    const gasFeeParams = normalizeReplacementGasFeeParams(
      transaction?.replacementParams,
    );
    const didComplete = await executeHardwareWalletOperation({
      address: selectedAddress,
      operationType: 'transaction',
      ensureDeviceReady: hardwareWallet.ensureDeviceReady,
      setPendingOperationAddress: hardwareWallet.setPendingOperationAddress,
      showAwaitingConfirmation: hardwareWallet.showAwaitingConfirmation,
      hideAwaitingConfirmation: hardwareWallet.hideAwaitingConfirmation,
      showHardwareWalletError: hardwareWallet.showHardwareWalletError,
      execute: async () => {
        if (
          transaction?.replacementParams?.type ===
          LedgerReplacementTxTypes.SPEED_UP
        ) {
          await speedUpTransactionController(transaction.id, gasFeeParams);
          return;
        }
        if (
          transaction?.replacementParams?.type ===
          LedgerReplacementTxTypes.CANCEL
        ) {
          await Engine.context.TransactionController.stopTransaction(
            transaction.id,
            gasFeeParams,
          );
          return;
        }
        await Engine.context.ApprovalController.acceptRequest(
          transaction.id,
          undefined,
          { waitForResult: true },
        );
      },
      onRejected: closeSpeedUpCancelModal,
    });
    if (didComplete) {
      closeSpeedUpCancelModal();
    }
  };

  const signQRTransaction = async (transactionMeta) => {
    const { TransactionController } = Engine.context;
    navigation.navigate(
      ...createQRSigningTransactionModalNavDetails({
        transactionId: transactionMeta.id,
        onConfirmationComplete: (confirmed) => {
          if (!confirmed) {
            TransactionController.cancelTransaction(transactionMeta.id);
          }
        },
      }),
    );
  };

  const cancelUnsignedQRTransaction = async (tx) => {
    await Engine.context.ApprovalController.rejectRequest(
      tx.id,
      providerErrors.userRejectedRequest(),
    );
  };

  const submitReplacementTransaction = async (
    transactionObject,
    { action, rate, transactionIdRef, signMode, onFailure },
  ) => {
    try {
      if (transactionObject?.error) {
        return;
      }
      const ledgerAccount = isHardwareAccount(selectedAddress, [
        ExtendedKeyringTypes.ledger,
      ]);
      const qrHardwareAccount = isHardwareAccount(selectedAddress, [
        ExtendedKeyringTypes.qr,
      ]);
      const params = getGasValuesForReplacement(
        getParamsToSend(transactionObject),
        getPreviousGasFromController(transactionIdRef.current),
        rate,
      );
      if (ledgerAccount) {
        const isEip1559 = params?.maxFeePerGas && params?.maxPriorityFeePerGas;
        await signLedgerTransaction({
          id: transactionIdRef.current,
          replacementParams: {
            type: action,
            ...(isEip1559
              ? { eip1559GasFee: params }
              : { legacyGasFee: params }),
          },
        });
        return;
      }
      if (qrHardwareAccount) {
        navigation.navigate(
          ...createQRSigningTransactionModalNavDetails({
            transactionId: transactionIdRef.current,
            signMode,
            gasValues: params,
            onConfirmationComplete: () => undefined,
          }),
        );
        closeSpeedUpCancelModal();
        return;
      }
      if (action === LedgerReplacementTxTypes.SPEED_UP) {
        await speedUpTransactionController(transactionIdRef.current, params);
      } else {
        await Engine.context.TransactionController.stopTransaction(
          transactionIdRef.current,
          params,
        );
      }
      closeSpeedUpCancelModal();
    } catch (error) {
      onFailure(error);
    }
  };

  const speedUpTransaction = (transactionObject) =>
    submitReplacementTransaction(transactionObject, {
      action: LedgerReplacementTxTypes.SPEED_UP,
      rate: SPEED_UP_RATE,
      transactionIdRef: speedUpTxIdRef,
      signMode: QRSignMode.SpeedUp,
      onFailure: handleSpeedUpTransactionFailure,
    });

  const cancelTransaction = (transactionObject) =>
    submitReplacementTransaction(transactionObject, {
      action: LedgerReplacementTxTypes.CANCEL,
      rate: CANCEL_RATE,
      transactionIdRef: cancelTxIdRef,
      signMode: QRSignMode.Cancel,
      onFailure: handleCancelTransactionFailure,
    });

  const onSpeedUpAction = (speedUpAction, tx) => {
    if (!speedUpAction) {
      closeSpeedUpCancelModal();
      return;
    }
    if (!tx) {
      return;
    }
    speedUpTxIdRef.current = tx.id;
    existingTxRef.current = tx;
    setSpeedUpIsOpen(true);
    setCancelIsOpen(false);
    setConfirmDisabled(
      validateTransactionActionBalance(tx, SPEED_UP_RATE, accounts),
    );
  };

  const onCancelAction = (cancelAction, tx) => {
    if (!cancelAction) {
      closeSpeedUpCancelModal();
      return;
    }
    if (!tx) {
      return;
    }
    cancelTxIdRef.current = tx.id;
    existingTxRef.current = tx;
    setSpeedUpIsOpen(false);
    setCancelIsOpen(true);
    setConfirmDisabled(
      validateTransactionActionBalance(tx, CANCEL_RATE, accounts),
    );
  };

  const renderItem = ({ item, index }) => (
    <TransactionElement
      tx={item}
      i={index}
      assetSymbol={assetSymbol}
      onSpeedUpAction={onSpeedUpAction}
      isQRHardwareAccount={isQRHardwareAccount}
      isLedgerAccount={isLedgerAccount}
      signQRTransaction={signQRTransaction}
      signLedgerTransaction={signLedgerTransaction}
      cancelUnsignedQRTransaction={cancelUnsignedQRTransaction}
      onCancelAction={onCancelAction}
      onPressItem={toggleDetailsView}
      selectedAddress={selectedAddress}
      collectibleContracts={collectibleContracts}
      exchangeRate={exchangeRate}
      currentCurrency={currentCurrency}
      navigation={navigation}
      txChainId={item.chainId}
      location={location}
    />
  );

  const renderGroupedActivityItem = ({ item, index }) => {
    if (item.type === 'pending-header') {
      return <ActivityListDateHeader label={strings('transaction.pending')} />;
    }
    if (item.type === 'date-header') {
      return <ActivityListDateHeader timestamp={item.date} />;
    }
    const tx =
      item.item.raw?.type === 'localTransaction'
        ? item.item.raw.data.primaryTransaction
        : undefined;
    return tx ? (
      <AssetDetailsActivityListItem
        transaction={tx}
        index={index}
        assetSymbol={assetSymbol}
        chainId={chainId}
        tokenChainId={tokenChainId}
        navigation={navigation}
        onSpeedUpAction={onSpeedUpAction}
        onCancelAction={onCancelAction}
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
  const shouldUseActivityRedesign =
    isActivityRedesignEnabled &&
    location === TransactionDetailLocation.AssetDetails;
  const activityListData = shouldUseActivityRedesign
    ? groupActivityListItems(
        filteredTransactions.map((transaction) =>
          mapTransactionToActivityItem({
            transaction,
            assetSymbol,
            currentChainId: chainId,
            tokenChainId,
          }),
        ),
      )
    : filteredTransactions;
  const useAssetOnlyExplorer = isAssetDetailsExplorer || Boolean(tokenChainId);
  const footerChainId = useAssetOnlyExplorer
    ? (getHexEvmChainId(explorerContextChainId) ?? explorerContextChainId)
    : chainId;

  return (
    <PriceChartProvider>
      <View style={styles.wrapper}>
        {!ready || loading ? (
          renderLoader()
        ) : (
          <View style={styles.wrapper}>
            <PriceChartContext.Consumer>
              {({ isChartBeingTouched }) => (
                <FlashList
                  testID={ActivitiesViewSelectorsIDs.CONTAINER}
                  ref={flatListRef}
                  data={activityListData}
                  extraData={selectedTransactions}
                  keyExtractor={
                    shouldUseActivityRedesign
                      ? getGroupedActivityListItemKey
                      : (item) => item.id.toString()
                  }
                  getItemType={
                    shouldUseActivityRedesign ? (item) => item.type : undefined
                  }
                  refreshControl={
                    <RefreshControl
                      colors={[colors.primary.default]}
                      tintColor={colors.icon.default}
                      refreshing={refreshing}
                      onRefresh={async () => {
                        setRefreshing(true);
                        setRefreshing(false);
                      }}
                    />
                  }
                  renderItem={
                    shouldUseActivityRedesign
                      ? renderGroupedActivityItem
                      : renderItem
                  }
                  ListHeaderComponent={header}
                  ListFooterComponent={
                    filteredTransactions.length > 0 ? (
                      <TransactionsFooter
                        chainId={footerChainId}
                        providerType={providerConfig.type}
                        rpcBlockExplorer={rpcBlockExplorer}
                        isNonEvmChain={isExplorerContextNonEvm}
                        omitGlobalProviderExplorerFallback={
                          isAssetDetailsExplorer
                        }
                        onViewBlockExplorer={viewOnBlockExplore}
                        showDisclaimer
                      />
                    ) : (
                      renderEmpty()
                    )
                  }
                  contentContainerStyle={styles.listContentContainer}
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
            {!isSigningQRObject && (
              <CancelSpeedupModal
                isVisible={speedUpIsOpen || cancelIsOpen}
                isCancel={cancelIsOpen}
                tx={existingTxRef.current}
                onConfirm={
                  cancelIsOpen ? cancelTransaction : speedUpTransaction
                }
                onClose={closeSpeedUpCancelModal}
                confirmDisabled={confirmDisabled}
              />
            )}
          </View>
        )}
      </View>
    </PriceChartProvider>
  );
};

Transactions.propTypes = {
  assetSymbol: PropTypes.string,
  /**
   * Map of accounts to information objects including balances
   */
  accounts: PropTypes.object,
  /**
   * Callback to close the view
   */
  close: PropTypes.func,
  /**
   * Network configurations
   */
  networkConfigurations: PropTypes.object,
  /**
    /* navigation object required to push new views
    */
  navigation: PropTypes.object,
  /**
   * Object representing the configuration of the current selected network
   */
  providerConfig: PropTypes.object,
  /**
   * An array that represents the user collectible contracts
   */
  collectibleContracts: PropTypes.array,
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
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * Loading flag from an external call
   */
  loading: PropTypes.bool,
  /**
   * Pass the flatlist ref to the parent
   */
  onRefSet: PropTypes.func,
  /**
   * Optional header component
   */
  header: PropTypes.object,
  /**
   * When true, suppresses the empty state footer when there are no transactions
   */
  hideEmptyState: PropTypes.bool,
  /**
   * Optional header height
   */
  headerHeight: PropTypes.number,
  exchangeRate: PropTypes.number,
  isSigningQRObject: PropTypes.bool,
  chainId: PropTypes.string,
  /**
   * On scroll past navbar callback
   */
  onScrollThroughContent: PropTypes.func,
  gasFeeEstimates: PropTypes.object,
  /**
   * Chain ID of the token
   */
  tokenChainId: PropTypes.string,
  /**
   * (optional) Skip automatic scrolling when a transaction is clicked/expanded.
   * Useful in views like Asset Details scrolling inside modals will cause issues (such as closing the stacked tx modal)
   */
  skipScrollOnClick: PropTypes.bool,
  /**
   * Location context for analytics tracking (home or asset_details)
   */
  location: PropTypes.string,
  hardwareWallet: PropTypes.shape({
    ensureDeviceReady: PropTypes.func,
    setPendingOperationAddress: PropTypes.func,
    showAwaitingConfirmation: PropTypes.func,
    hideAwaitingConfirmation: PropTypes.func,
    showHardwareWalletError: PropTypes.func,
  }),
  isActivityRedesignEnabled: PropTypes.bool,
};

Transactions.defaultProps = {
  headerHeight: 0,
  hardwareWallet: {
    ensureDeviceReady: async () => false,
    setPendingOperationAddress: () => undefined,
    showAwaitingConfirmation: () => undefined,
    hideAwaitingConfirmation: () => undefined,
    showHardwareWalletError: () => undefined,
  },
};

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  chainId: selectChainId(state),
  networkClientId: selectNetworkClientId(state),
  collectibleContracts: collectibleContractsSelector(state),
  currentCurrency: selectCurrentCurrency(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  networkConfigurations: selectNetworkConfigurations(state),
  providerConfig: selectProviderConfig(state),
  gasFeeEstimates: selectGasFeeEstimates(state),
  primaryCurrency: selectPrimaryCurrency(state),
  gasEstimateType: selectGasFeeControllerEstimateType(state),
  networkType: selectProviderType(state),
  isActivityRedesignEnabled: selectIsActivityRedesignEnabled(state),
});

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
});

export { Transactions as UnconnectedTransactions };

const TransactionsWithHardwareWallet = (props) => {
  const hardwareWallet = useHardwareWallet();

  return <Transactions {...props} hardwareWallet={hardwareWallet} />;
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withQRHardwareAwareness(TransactionsWithHardwareWallet));
