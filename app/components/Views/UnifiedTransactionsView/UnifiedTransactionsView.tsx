import { Transaction as NonEvmTransaction } from '@metamask/keyring-api';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { SmartTransaction } from '@metamask/smart-transactions-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../selectors/multichain/multichain';
import { selectSelectedAccountGroupInternalAccounts } from '../../../selectors/multichainAccounts/accountTreeController';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import {
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from '../../../selectors/networkEnablementController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectSortedEVMTransactionsForSelectedAccountGroup } from '../../../selectors/transactionController';
import { baseStyles } from '../../../styles/common';
import {
  filterByAddress,
  isTransactionOnChains,
  sortTransactions,
} from '../../../util/activity';
import { areAddressesEqual, isHardwareAccount } from '../../../util/address';
import { getBlockExplorerAddressUrl } from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { useStyles } from '../../hooks/useStyles';
import PriceChartContext, {
  PriceChartProvider,
} from '../../UI/AssetOverview/PriceChart/PriceChart.context';
import { useBridgeHistoryItemBySrcTxHash } from '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import MultichainBridgeTransactionListItem from '../../UI/MultichainBridgeTransactionListItem';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import TransactionActionModal from '../../UI/TransactionActionModal';
import TransactionElement from '../../UI/TransactionElement';
import RetryModal from '../../UI/Transactions/RetryModal';
import { filterDuplicateOutgoingTransactions } from '../../UI/Transactions/utils';
import TransactionsFooter from '../../UI/Transactions/TransactionsFooter';
import MultichainTransactionsFooter from '../MultichainTransactionsView/MultichainTransactionsFooter';
import { getAddressUrl } from '../../../core/Multichain/utils';
import UpdateEIP1559Tx from '../confirmations/legacy/components/UpdateEIP1559Tx';
import styleSheet from './UnifiedTransactionsView.styles';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import useBlockExplorer from '../../hooks/useBlockExplorer';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';

type SmartTransactionWithId = SmartTransaction & { id: string };
type EvmTransaction = TransactionMeta | SmartTransactionWithId;
type TransactionMetaWithImport = TransactionMeta & {
  insertImportTime?: boolean;
};

const getTransactionId = (tx: EvmTransaction) => tx.id;

const isTransactionMetaLike = (tx: EvmTransaction): tx is TransactionMeta =>
  'chainId' in tx && typeof tx.chainId === 'string';

const getEvmTransactionTime = (tx: EvmTransaction) => tx.time ?? 0;

const getEvmChainId = (tx: EvmTransaction) => tx.chainId;

enum TransactionKind {
  Evm = 'evm',
  NonEvm = 'nonEvm',
}

type UnifiedItem =
  | { kind: TransactionKind.Evm; tx: TransactionMeta | SmartTransactionWithId }
  | { kind: TransactionKind.NonEvm; tx: NonEvmTransaction };

interface UnifiedTransactionsViewProps {
  header?: React.ReactElement;
  tabLabel?: string;
  chainId?: string; // used by non-EVM list items for explorer links
}

const UnifiedTransactionsView = ({
  header,
  chainId,
}: UnifiedTransactionsViewProps) => {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();

  const evmTransactions = useSelector(
    selectSortedEVMTransactionsForSelectedAccountGroup,
  );
  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );
  const nonEvmTransactions = useMemo(
    () => nonEvmState?.transactions ?? [],
    [nonEvmState?.transactions],
  );

  const currentCurrency = useSelector(selectCurrentCurrency);

  // Inputs required to reproduce EVM filtering pipeline
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const tokens = useSelector(selectTokens);
  const selectedAccountGroupInternalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const selectedAccountGroupInternalAccountsAddresses =
    selectedAccountGroupInternalAccounts.map((account) => account.address);
  const selectedAccountGroupEvmAddress = useMemo(() => {
    const evmAccount = selectedAccountGroupInternalAccounts.find(
      (account) =>
        account.type === 'eip155:eoa' || account.type === 'eip155:erc4337',
    );
    return evmAccount?.address ?? '';
  }, [selectedAccountGroupInternalAccounts]);

  const selectedAccountGroupSolanaAddress = useMemo(() => {
    const solanaAccount = selectedAccountGroupInternalAccounts.find(
      (account) => account.type === 'solana:data-account',
    );
    return solanaAccount?.address ?? '';
  }, [selectedAccountGroupInternalAccounts]);

  const enabledEVMNetworks = useSelector(selectEVMEnabledNetworks);
  const enabledEVMChainIds = useMemo(
    () => enabledEVMNetworks ?? [],
    [enabledEVMNetworks],
  );
  const enabledNonEVMNetworks = useSelector(selectNonEVMEnabledNetworks);
  const enabledNonEVMChainIds = useMemo(
    () => enabledNonEVMNetworks ?? [],
    [enabledNonEVMNetworks],
  );
  const providerType = useSelector(selectProviderType);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const { data, nonEvmTransactionsForSelectedChain } = useMemo<{
    data: UnifiedItem[];
    nonEvmTransactionsForSelectedChain: NonEvmTransaction[];
  }>(() => {
    // Build EVM submitted/confirmed with full filtering pipeline
    let accountAddedTimeInsertPointFound = false;
    const addedAccountTime = selectedInternalAccount?.metadata?.importTime;
    const submittedTxs: EvmTransaction[] = [];

    const sortedTransactions = sortTransactions(
      evmTransactions ?? [],
    ) as EvmTransaction[];

    const allTransactionsSorted = sortedTransactions.filter(
      (tx, index, self) => {
        const key = getTransactionId(tx);
        return self.findIndex((_tx) => getTransactionId(_tx) === key) === index;
      },
    );

    const transactionMetaPool = allTransactionsSorted.filter(
      isTransactionMetaLike,
    ) as TransactionMeta[];

    const allConfirmed = allTransactionsSorted.filter((tx) => {
      if (!isTransactionMetaLike(tx)) {
        const status = tx.status;
        if (
          status === 'submitted' ||
          status === 'signed' ||
          status === 'unapproved' ||
          status === 'approved' ||
          status === 'pending'
        ) {
          submittedTxs.push(tx as SmartTransactionWithId);
        }
        return false;
      }

      const isReceivedOrSentTransaction =
        selectedAccountGroupInternalAccountsAddresses.some((addr) =>
          filterByAddress(tx, tokens, addr, transactionMetaPool, bridgeHistory),
        );
      if (!isReceivedOrSentTransaction) return false;

      const insertImportTime = addAccountTimeFlagFilter(
        tx as unknown as object,
        addedAccountTime as unknown as object,
        accountAddedTimeInsertPointFound as unknown as object,
      );
      const updatedTx = { ...tx, insertImportTime };
      if (updatedTx.insertImportTime) accountAddedTimeInsertPointFound = true;

      // not sure if pending is a valid status for EVM transactions, but keeping
      // it for now to avoid breaking changes
      const status = tx.status as TransactionMeta['status'] | 'pending';
      switch (status) {
        case 'submitted':
        case 'signed':
        case 'unapproved':
        case 'approved':
        case 'pending':
          submittedTxs.push(updatedTx);
          return false;
        case 'confirmed':
          break;
      }
      return isReceivedOrSentTransaction;
    }) as TransactionMetaWithImport[];

    // Network filtering for confirmed EVM txs
    const allConfirmedFiltered: TransactionMetaWithImport[] =
      allConfirmed.filter((tx) =>
        isTransactionOnChains(tx, enabledEVMChainIds, transactionMetaPool),
      );
    // Deduplicate submitted by (address + chain + nonce) and drop if already confirmed
    const seenSubmittedNonces = new Set<string>();
    const submittedTxsFiltered = submittedTxs.filter(
      ({ chainId: _chainId, txParams }) => {
        const { from, nonce } = txParams || {};
        if (
          !selectedAccountGroupInternalAccountsAddresses.some((addr) =>
            areAddressesEqual(from, addr),
          )
        ) {
          return false;
        }

        const dedupeKey = `${_chainId}-${String(from).toLowerCase()}-${nonce}`;
        if (seenSubmittedNonces.has(dedupeKey)) {
          return false;
        }

        const alreadyConfirmed = allConfirmedFiltered.find(
          (confirmedTx) =>
            selectedAccountGroupInternalAccountsAddresses.some((addr) =>
              areAddressesEqual(confirmedTx.txParams?.from, addr),
            ) &&
            confirmedTx.chainId === _chainId &&
            confirmedTx.txParams?.nonce === nonce,
        );

        if (alreadyConfirmed) {
          return false;
        }

        seenSubmittedNonces.add(dedupeKey);
        return true;
      },
    );
    // Ensure insertImportTime appears at least once if applicable
    if (!accountAddedTimeInsertPointFound && allConfirmedFiltered?.length) {
      const lastIndex = allConfirmedFiltered.length - 1;
      allConfirmedFiltered[lastIndex] = {
        ...allConfirmedFiltered[lastIndex],
        insertImportTime: true,
      };
    }

    // EVM: pending/submitted first (desc), then confirmed (dedup outgoing)
    const evmPendingFirst = [...submittedTxsFiltered].sort(
      (a, b) => getEvmTransactionTime(b) - getEvmTransactionTime(a),
    );
    const evmConfirmedDeduped =
      filterDuplicateOutgoingTransactions(allConfirmedFiltered);

    // Non-EVM: filter by enabled chains
    const filteredNonEvmTransactionsForSelectedChain = nonEvmTransactions
      .filter((tx) => enabledNonEVMChainIds.includes(tx.chain))
      // deduplicate by id
      .filter(
        (tx, index, self) => index === self.findIndex((t) => t.id === tx.id),
      );

    const evmPendingItems: UnifiedItem[] = evmPendingFirst.map((tx) => ({
      kind: TransactionKind.Evm,
      tx,
    }));
    const evmConfirmedItems: UnifiedItem[] = evmConfirmedDeduped.map((tx) => ({
      kind: TransactionKind.Evm,
      tx,
    }));
    const nonEvmItems: UnifiedItem[] = (
      filteredNonEvmTransactionsForSelectedChain ?? []
    ).map((tx) => ({
      kind: TransactionKind.NonEvm,
      tx,
    }));

    // Merge confirmed by time across EVM confirmed and non-EVM
    const confirmedUnified = [...evmConfirmedItems, ...nonEvmItems].sort(
      (a, b) => {
        const ta =
          a.kind === TransactionKind.Evm
            ? getEvmTransactionTime(a.tx)
            : (a.tx.timestamp ?? 0) * 1000;
        const tb =
          b.kind === TransactionKind.Evm
            ? getEvmTransactionTime(b.tx)
            : (b.tx.timestamp ?? 0) * 1000;
        return tb - ta;
      },
    );

    return {
      data: [...evmPendingItems, ...confirmedUnified],
      nonEvmTransactionsForSelectedChain:
        filteredNonEvmTransactionsForSelectedChain,
    };
  }, [
    evmTransactions,
    nonEvmTransactions,
    selectedAccountGroupInternalAccountsAddresses,
    enabledEVMChainIds,
    enabledNonEVMChainIds,
    selectedInternalAccount,
    tokens,
    bridgeHistory,
  ]);

  const hasEvmChainsEnabled = enabledEVMChainIds.length > 0;
  const popularListBlockExplorer = useBlockExplorer(
    hasEvmChainsEnabled ? enabledEVMChainIds[0] : undefined,
  );

  const configBlockExplorerUrl = useMemo(() => {
    // When using the per-dapp/multiselect network selector, only return a block
    // explorer if exactly one EVM chain is selected. Otherwise, undefined.
    if (!enabledEVMChainIds?.length || enabledEVMChainIds.length !== 1) {
      return undefined;
    }
    const selectedChainId = enabledEVMChainIds[0];
    const config = evmNetworkConfigurationsByChainId?.[selectedChainId];
    if (!config) return undefined;
    const index = config.defaultBlockExplorerUrlIndex ?? 0;
    return config.blockExplorerUrls?.[index];
  }, [enabledEVMChainIds, evmNetworkConfigurationsByChainId]);

  const blockExplorerUrl = useMemo(() => {
    // configBlockExplorerUrl contains block explorer urls only for networks added by default after fresh install
    // other networks should use PopularList, which is used by useBlockExplorer hook
    if (configBlockExplorerUrl) {
      return configBlockExplorerUrl;
    }
    return hasEvmChainsEnabled
      ? popularListBlockExplorer.getBlockExplorerUrl(
          selectedAccountGroupEvmAddress,
        ) || undefined
      : undefined;
  }, [
    configBlockExplorerUrl,
    popularListBlockExplorer,
    selectedAccountGroupEvmAddress,
    hasEvmChainsEnabled,
  ]);

  const hasNonEvmChainsEnabled = enabledNonEVMChainIds.length > 0;

  const showEvmFooter = hasEvmChainsEnabled && !hasNonEvmChainsEnabled;
  const showNonEvmFooter = hasNonEvmChainsEnabled && !hasEvmChainsEnabled;

  const onViewBlockExplorer = useCallback(() => {
    if (!selectedAccountGroupEvmAddress) {
      return;
    }

    let url;
    let title;
    if (configBlockExplorerUrl) {
      const result = getBlockExplorerAddressUrl(
        providerType,
        selectedAccountGroupEvmAddress,
        blockExplorerUrl,
      );
      url = result.url;
      title = result.title;

      if (!url) {
        return;
      }
    } else {
      url = blockExplorerUrl;
      title = hasEvmChainsEnabled
        ? popularListBlockExplorer.getBlockExplorerName(enabledEVMChainIds[0])
        : undefined;
    }

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title,
      },
    });
  }, [
    navigation,
    providerType,
    blockExplorerUrl,
    selectedAccountGroupEvmAddress,
    popularListBlockExplorer,
    enabledEVMChainIds,
    configBlockExplorerUrl,
    hasEvmChainsEnabled,
  ]);

  const allNonEvmChainsAreSolana = useMemo(
    () =>
      enabledNonEVMChainIds.every((chain) =>
        chain.toLowerCase().startsWith('solana:'),
      ),
    [enabledNonEVMChainIds],
  );

  const nonEvmExplorerChainId = useMemo(() => {
    if (enabledNonEVMChainIds.length) {
      return enabledNonEVMChainIds[0];
    }
    if (chainId?.includes(':')) {
      return chainId;
    }
    return undefined;
  }, [enabledNonEVMChainIds, chainId]);

  const nonEvmExplorerUrl = useMemo(() => {
    if (!selectedAccountGroupSolanaAddress || !nonEvmExplorerChainId) {
      return '';
    }
    return getAddressUrl(
      selectedAccountGroupSolanaAddress,
      nonEvmExplorerChainId as SupportedCaipChainId,
    );
  }, [nonEvmExplorerChainId, selectedAccountGroupSolanaAddress]);

  const showNonEvmExplorerLink =
    showNonEvmFooter && allNonEvmChainsAreSolana && Boolean(nonEvmExplorerUrl);

  const onViewNonEvmExplorer = useCallback(() => {
    if (!nonEvmExplorerUrl) {
      return;
    }

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: nonEvmExplorerUrl,
      },
    });
  }, [navigation, nonEvmExplorerUrl]);

  const footerComponent = useMemo(() => {
    if (showEvmFooter) {
      return (
        <TransactionsFooter
          chainId={enabledEVMChainIds[0]}
          providerType={configBlockExplorerUrl ? providerType : undefined}
          rpcBlockExplorer={blockExplorerUrl}
          onViewBlockExplorer={onViewBlockExplorer}
        />
      );
    }

    if (showNonEvmFooter) {
      return (
        <MultichainTransactionsFooter
          url={nonEvmExplorerUrl}
          hasTransactions={
            (nonEvmTransactionsForSelectedChain?.length ?? 0) > 0
          }
          showDisclaimer
          showExplorerLink={showNonEvmExplorerLink}
          onViewMore={onViewNonEvmExplorer}
        />
      );
    }

    return null;
  }, [
    enabledEVMChainIds,
    nonEvmTransactionsForSelectedChain?.length,
    onViewBlockExplorer,
    onViewNonEvmExplorer,
    providerType,
    blockExplorerUrl,
    nonEvmExplorerUrl,
    showEvmFooter,
    showNonEvmExplorerLink,
    showNonEvmFooter,
    configBlockExplorerUrl,
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const {
    retryIsOpen,
    retryErrorMsg,
    speedUpIsOpen,
    cancelIsOpen,
    speedUp1559IsOpen,
    cancel1559IsOpen,
    speedUpConfirmDisabled,
    cancelConfirmDisabled,
    existingGas,
    existingTx,
    speedUpTxId,
    cancelTxId,
    toggleRetry,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCompleted,
    onCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
    signQRTransaction,
    signLedgerTransaction,
    cancelUnsignedQRTransaction,
  } = useUnifiedTxActions();
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await updateIncomingTransactions();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const listRef = useRef<FlashListRef<UnifiedItem>>(null);

  const renderEmptyList = () => (
    <View style={styles.emptyList}>
      <TabEmptyState description={strings('wallet.no_transactions')} />
    </View>
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: UnifiedItem;
    index: number;
  }) => {
    if (item.kind === TransactionKind.Evm) {
      // Reuse existing EVM TransactionElement via the Transactions list item renderer
      return (
        <TransactionElement
          tx={item.tx}
          i={index}
          navigation={navigation}
          txChainId={getEvmChainId(item.tx)}
          selectedAddress={selectedInternalAccount?.address}
          onSpeedUpAction={onSpeedUpAction}
          onCancelAction={onCancelAction}
          signQRTransaction={signQRTransaction}
          cancelUnsignedQRTransaction={cancelUnsignedQRTransaction}
          isQRHardwareAccount={isHardwareAccount(
            selectedInternalAccount?.address ?? '',
            [ExtendedKeyringTypes.qr],
          )}
          isLedgerAccount={isHardwareAccount(
            selectedInternalAccount?.address ?? '',
            [ExtendedKeyringTypes.ledger],
          )}
          signLedgerTransaction={signLedgerTransaction}
          currentCurrency={currentCurrency}
          showBottomBorder
        />
      );
    }

    // Render non-EVM transactions
    const srcTxHash = item.tx.id; // id is unique for multichain tx
    const bridgeHistoryItem = bridgeHistoryItemsBySrcTxHash[srcTxHash];
    return bridgeHistoryItem ? (
      <MultichainBridgeTransactionListItem
        transaction={item.tx}
        bridgeHistoryItem={bridgeHistoryItem}
        navigation={navigation}
        index={index}
      />
    ) : (
      <MultichainTransactionListItem
        transaction={item.tx}
        navigation={navigation}
        index={index}
        // Use the transaction's chain property for non-EVM transactions (contains CAIP chainId)
        chainId={item.tx.chain as unknown as SupportedCaipChainId}
      />
    );
  };

  return (
    <PriceChartProvider>
      <View style={styles.container}>
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <FlashList
              ref={listRef}
              data={data}
              renderItem={renderItem}
              keyExtractor={(listItem) =>
                listItem.kind === TransactionKind.Evm
                  ? getTransactionId(listItem.tx)
                  : String(
                      listItem.tx.id ??
                        `${listItem.tx.chain}-${listItem.tx.timestamp ?? '0'}`,
                    )
              }
              ListHeaderComponent={header}
              ListEmptyComponent={renderEmptyList}
              ListFooterComponent={footerComponent}
              style={baseStyles.flexGrow}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary.default]}
                  tintColor={colors.icon.default}
                />
              }
              scrollEnabled={!isChartBeingTouched}
            />
          )}
        </PriceChartContext.Consumer>
        {/* Action modals for EVM Transactions */}
        {(speedUp1559IsOpen || cancel1559IsOpen) && (
          <Modal
            isVisible
            animationIn="slideInUp"
            animationOut="slideOutDown"
            style={styles.modal}
            backdropColor={colors.overlay.default}
            backdropOpacity={1}
            animationInTiming={600}
            animationOutTiming={600}
            onBackdropPress={
              cancel1559IsOpen ? onCancelCompleted : onSpeedUpCompleted
            }
            onBackButtonPress={
              cancel1559IsOpen ? onCancelCompleted : onSpeedUpCompleted
            }
            onSwipeComplete={
              cancel1559IsOpen ? onCancelCompleted : onSpeedUpCompleted
            }
            swipeDirection={'down'}
            propagateSwipe
          >
            <KeyboardAwareScrollView
              contentContainerStyle={styles.scrollViewContent}
            >
              <UpdateEIP1559Tx
                gas={existingTx?.txParams?.gas}
                onSave={
                  cancel1559IsOpen ? cancelTransaction : speedUpTransaction
                }
                onCancel={
                  cancel1559IsOpen ? onCancelCompleted : onSpeedUpCompleted
                }
                existingGas={existingGas}
                isCancel={cancel1559IsOpen}
              />
            </KeyboardAwareScrollView>
          </Modal>
        )}
        {cancelIsOpen && (
          <TransactionActionModal
            isVisible={cancelIsOpen}
            confirmDisabled={cancelConfirmDisabled}
            onCancelPress={onCancelCompleted}
            onConfirmPress={cancelTransaction}
            confirmText={strings('transaction.lets_try')}
            confirmButtonMode={'confirm'}
            cancelText={strings('transaction.nevermind')}
            feeText={undefined}
            titleText={strings('transaction.cancel_tx_title')}
            gasTitleText={strings('transaction.gas_cancel_fee')}
            descriptionText={strings('transaction.cancel_tx_message')}
          />
        )}
        {speedUpIsOpen && (
          <TransactionActionModal
            isVisible={speedUpIsOpen}
            confirmDisabled={speedUpConfirmDisabled}
            onCancelPress={onSpeedUpCompleted}
            onConfirmPress={speedUpTransaction}
            confirmText={strings('transaction.lets_try')}
            confirmButtonMode={'confirm'}
            cancelText={strings('transaction.nevermind')}
            feeText={undefined}
            titleText={strings('transaction.speedup_tx_title')}
            gasTitleText={strings('transaction.gas_speedup_fee')}
            descriptionText={strings('transaction.speedup_tx_message')}
          />
        )}
        <RetryModal
          onCancelPress={() => toggleRetry(undefined)}
          onConfirmPress={() => {
            toggleRetry(undefined);
            if (speedUpTxId)
              onSpeedUpAction(
                true,
                existingGas ?? undefined,
                existingTx ?? undefined,
              );
            if (cancelTxId)
              onCancelAction(
                true,
                existingGas ?? undefined,
                existingTx ?? undefined,
              );
          }}
          retryIsOpen={retryIsOpen}
          errorMsg={retryErrorMsg}
        />
      </View>
    </PriceChartProvider>
  );
};

export default UnifiedTransactionsView;
