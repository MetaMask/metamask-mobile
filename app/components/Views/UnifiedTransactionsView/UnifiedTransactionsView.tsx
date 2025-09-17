import { Transaction as NonEvmTransaction } from '@metamask/keyring-api';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { SmartTransaction } from '@metamask/smart-transactions-controller/dist/types';
import { CHAIN_IDS, TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Text from '../../../component-library/components/Texts/Text';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../selectors/multichain/multichain';
import { selectSelectedAccountGroupInternalAccounts } from '../../../selectors/multichainAccounts/accountTreeController';
import {
  selectChainId,
  selectIsPopularNetwork,
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
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import { PopularList } from '../../../util/networks/customNetworks';
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
import UpdateEIP1559Tx from '../confirmations/legacy/components/UpdateEIP1559Tx';
import styleSheet from './UnifiedTransactionsView.styles';
import { useUnifiedTxActions } from './useUnifiedTxActions';

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
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
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

  // TODO: This should be deleted once we deprecate the global network selector,
  // we need to use the selected account group chain ids
  const currentEvmChainId = useSelector(selectChainId);

  const data: UnifiedItem[] = useMemo(() => {
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
          filterByAddress(tx, tokens, addr, transactionMetaPool),
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
    let allConfirmedFiltered: TransactionMetaWithImport[] = [];
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      allConfirmedFiltered = allConfirmed.filter((tx) =>
        isTransactionOnChains(tx, enabledEVMChainIds, allConfirmed),
      );
    } else if (isPopularNetwork) {
      const popularChainIds: Hex[] = [
        CHAIN_IDS.MAINNET as Hex,
        CHAIN_IDS.LINEA_MAINNET as Hex,
        ...PopularList.map((n) => n.chainId as Hex),
      ];
      allConfirmedFiltered = allConfirmed.filter((tx) =>
        isTransactionOnChains(tx, popularChainIds, allConfirmed),
      );
    } else {
      allConfirmedFiltered = allConfirmed.filter((tx) =>
        isTransactionOnChains(
          tx,
          currentEvmChainId ? [currentEvmChainId as Hex] : [],
          allConfirmed,
        ),
      );
    }
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
    const nonEvmTransactionsForSelectedChain = nonEvmTransactions
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
      nonEvmTransactionsForSelectedChain ?? []
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

    return [...evmPendingItems, ...confirmedUnified];
  }, [
    evmTransactions,
    nonEvmTransactions,
    selectedAccountGroupInternalAccountsAddresses,
    enabledEVMChainIds,
    enabledNonEVMChainIds,
    isPopularNetwork,
    selectedInternalAccount,
    tokens,
    currentEvmChainId,
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
      <Text style={styles.emptyListText}>
        {strings('wallet.no_transactions')}
      </Text>
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
        // Fallback to provided prop; component expects SupportedCaipChainId but only used for links
        chainId={(chainId ?? item.tx.chain) as unknown as SupportedCaipChainId}
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
              ListFooterComponent={null}
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
