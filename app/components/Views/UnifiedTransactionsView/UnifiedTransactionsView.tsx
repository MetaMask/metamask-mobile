import { Transaction as NonEvmTransaction } from '@metamask/keyring-api';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { SmartTransaction } from '@metamask/smart-transactions-controller';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { numberToHex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Routes from '../../../constants/navigation/Routes';
import { RPC } from '../../../constants/network';
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
import {
  selectLocalTransactions,
  selectRelatedChainIdsByTransactionId,
} from '../../../selectors/transactionController';
import { baseStyles } from '../../../styles/common';
import { areAddressesEqual, isHardwareAccount } from '../../../util/address';
import { getBlockExplorerAddressUrl } from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import { updateIncomingTransactions } from '../../../util/transaction-controller';
import { useStyles } from '../../hooks/useStyles';
import PriceChartContext, {
  PriceChartProvider,
} from '../../UI/AssetOverview/PriceChart/PriceChart.context';
import { useBridgeHistoryItemBySrcTxHash } from '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import {
  getSwapBridgeTxActivityTitle,
  handleUnifiedSwapsTxHistoryItemClick,
} from '../../UI/Bridge/utils/transaction-history';
import MultichainBridgeTransactionListItem from '../../UI/MultichainBridgeTransactionListItem';
import MultichainTransactionListItem from '../../UI/MultichainTransactionListItem';
import TransactionElement from '../../UI/TransactionElement';
import TransactionsFooter from '../../UI/Transactions/TransactionsFooter';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import MultichainTransactionsFooter from '../MultichainTransactionsView/MultichainTransactionsFooter';
import { getAddressUrl } from '../../../core/Multichain/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { CancelSpeedupModal } from '../confirmations/components/modals/cancel-speedup-modal';
import styleSheet from './UnifiedTransactionsView.styles';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { useTransactionAutoScroll } from './useTransactionAutoScroll';
import useBlockExplorer from '../../hooks/useBlockExplorer';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
import { UnifiedTransactionsViewSelectorsIDs } from './UnifiedTransactionsView.testIds';
import { useMultichainActivityMaliciousTokenKeys } from '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys';
import { filterMultichainTransactionsExcludingMaliciousTokenActivity } from '../../../util/multichain/multichainTransactionTokenScan';
import { useTransactionsQuery } from './useTransactionsQuery';
import {
  type EvmTransaction,
  TransactionKind,
  type TransactionViewModel,
  type UnifiedItem,
} from './types';
import {
  isBridgeHistoryForEvmTransaction,
  mergeTransactionsByTime,
} from './helpers/transformations';
import { normalizeTransaction } from './helpers/adapters';
import {
  mapApiEvmTransactions,
  mapKeyringTransaction,
  type ActivityListItem,
} from '../../../util/activity-adapters';
import {
  ActivityListItemRow,
  resolveActivityListItemTitle,
} from '../../UI/ActivityListItemRow/ActivityListItemRow';

const confirmedEvmOverscan = 5;
const visibilityConfig = { itemVisiblePercentThreshold: 1 };

const getTransactionId = (tx: EvmTransaction) => tx.id;
const isTransactionMetaLike = (
  tx: TransactionMeta | SmartTransaction,
): tx is EvmTransaction => 'id' in tx && typeof tx.id === 'string';

const getEvmTransactionTime = (tx: EvmTransaction) => tx.time ?? 0;

const getEvmChainId = (tx: EvmTransaction) => tx.chainId;

const noop = () => undefined;

const getActivityValue = (item: ActivityListItem) => {
  const { data } = item;

  if ('token' in data && data.token?.symbol) {
    return `${data.token.amount ?? ''} ${data.token.symbol}`.trim();
  }

  if ('destinationToken' in data && data.destinationToken?.symbol) {
    return `${data.destinationToken.amount ?? ''} ${
      data.destinationToken.symbol
    }`.trim();
  }

  if ('sourceToken' in data && data.sourceToken?.symbol) {
    return `${data.sourceToken.amount ?? ''} ${data.sourceToken.symbol}`.trim();
  }

  return undefined;
};

const getActivityFromTo = (item: ActivityListItem) => {
  const { data } = item;
  return {
    from: 'from' in data && typeof data.from === 'string' ? data.from : '',
    to: 'to' in data && typeof data.to === 'string' ? data.to : '',
  };
};

const generateKey = (item: UnifiedItem) => {
  if (item.kind === TransactionKind.Evm) {
    return getTransactionId(item.tx);
  }

  if (item.kind === TransactionKind.ConfirmedEvm) {
    return getTransactionId(item.tx.transactionMeta);
  }

  return String(item.tx.id ?? `${item.tx.chain}-${item.tx.timestamp ?? '0'}`);
};

interface UnifiedTransactionsViewProps {
  header?: React.ReactElement;
  tabLabel?: string;
  chainId?: string; // used by non-EVM list items for explorer links
  location?: TransactionDetailLocation;
  renderActivityListItemRow?: boolean;
}

const UnifiedTransactionsView = ({
  header,
  chainId,
  location,
  renderActivityListItemRow = false,
}: UnifiedTransactionsViewProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();
  const getBridgeHistoryItemByHash = useCallback(
    (hash?: string): BridgeHistoryItem | undefined => {
      if (!hash) {
        return undefined;
      }

      const normalizedHash = hash.toLowerCase();
      return (
        (bridgeHistoryItemsBySrcTxHash[hash] as
          | BridgeHistoryItem
          | undefined) ??
        (Object.entries(bridgeHistoryItemsBySrcTxHash).find(
          ([key]) => key.toLowerCase() === normalizedHash,
        )?.[1] as BridgeHistoryItem | undefined)
      );
    },
    [bridgeHistoryItemsBySrcTxHash],
  );

  const {
    data: evmTransactions,
    fetchNextPage,
    hasNextPage,
    isInitialLoading,
    isFetchingNextPage,
    refetch,
  } = useTransactionsQuery();

  const allConfirmedFiltered = useMemo<TransactionViewModel[]>(
    () => evmTransactions?.pages.flatMap((page) => page.data) ?? [],
    [evmTransactions],
  );

  const submittedTxs = useSelector(selectLocalTransactions);

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
  const selectedAccountGroupInternalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
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

  const relatedChainIdsByTransactionId = useSelector(
    selectRelatedChainIdsByTransactionId,
  );

  /** Drop confirmed rows not on currently enabled EVM chains (guards stale query pages). */
  const allConfirmedForEnabledChains = useMemo<TransactionViewModel[]>(() => {
    const chains = enabledEVMChainIds ?? [];
    if (chains.length === 0) {
      return [];
    }
    const allowed = new Set(chains.map((c) => c.toLowerCase()));
    return allConfirmedFiltered.filter(
      (tx) =>
        typeof tx.hexChainId === 'string' &&
        allowed.has(tx.hexChainId.toLowerCase()),
    );
  }, [allConfirmedFiltered, enabledEVMChainIds]);

  const { maliciousTokenKeys } =
    useMultichainActivityMaliciousTokenKeys(nonEvmTransactions);

  const providerType = useSelector(selectProviderType);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const unifiedTransactionSource = useMemo<{
    evmPendingTxs: EvmTransaction[];
    evmConfirmedTxs: TransactionViewModel[];
    chainFilteredNonEvmTransactionsForSelectedChain: NonEvmTransaction[];
  }>(() => {
    const bridgeHistoryValues = Object.values(bridgeHistory ?? {});
    const enabledEvmSet = new Set(
      (enabledEVMChainIds ?? []).map((id) => id.toLowerCase()),
    );
    const submittedTxsFiltered = submittedTxs.filter(
      (tx): tx is EvmTransaction => {
        if (!isTransactionMetaLike(tx)) {
          return false;
        }

        const { chainId: _chainId, txParams } = tx;

        if (!enabledEvmSet.size) {
          return false;
        }

        const relatedChainIds = relatedChainIdsByTransactionId.get(tx.id) ?? [
          String(_chainId ?? '').toLowerCase(),
        ];
        if (!relatedChainIds.some((id) => enabledEvmSet.has(id))) {
          return false;
        }

        const isBridgeTransaction = isBridgeHistoryForEvmTransaction(
          tx,
          bridgeHistoryValues,
        );
        const hash = 'hash' in tx ? tx.hash : undefined;
        const { from, nonce } = txParams || {};
        const hasNonce = nonce !== undefined && nonce !== null;

        const matchingConfirmedByHash = allConfirmedForEnabledChains.some(
          (confirmedTx) =>
            typeof hash === 'string' &&
            confirmedTx.hash.toLowerCase() === hash.toLowerCase() &&
            confirmedTx.hexChainId?.toLowerCase() === _chainId?.toLowerCase(),
        );
        const matchingConfirmedByNonce = allConfirmedForEnabledChains.some(
          (confirmedTx) =>
            hasNonce &&
            confirmedTx.nonce === nonce &&
            confirmedTx.hexChainId?.toLowerCase() === _chainId?.toLowerCase() &&
            Boolean(from) &&
            areAddressesEqual(confirmedTx.from, from),
        );

        if (
          matchingConfirmedByHash ||
          (!isBridgeTransaction && matchingConfirmedByNonce)
        ) {
          return false;
        }

        return true;
      },
    );

    // EVM: pending/submitted first (desc), then confirmed (dedup outgoing)
    const evmPendingFirst = [...submittedTxsFiltered].sort(
      (a, b) => getEvmTransactionTime(b) - getEvmTransactionTime(a),
    );

    // Non-EVM: filter by enabled chains, also include bridge txs
    // whose destination chain is enabled (e.g. Solana→Optimism bridge
    // should appear when viewing Optimism activity)
    const chainFilteredNonEvmTransactionsForSelectedChain = nonEvmTransactions
      .filter((tx) => {
        if (enabledNonEVMChainIds.includes(tx.chain)) return true;
        const bridge = bridgeHistoryValues.find(
          (item) => item.status?.srcChain?.txHash === tx.id,
        );
        return (
          bridge?.quote?.destChainId !== undefined &&
          enabledEVMChainIds.includes(numberToHex(bridge.quote.destChainId))
        );
      })
      // deduplicate by id
      .filter(
        (tx, index, self) => index === self.findIndex((t) => t.id === tx.id),
      );

    return {
      evmPendingTxs: evmPendingFirst,
      evmConfirmedTxs: allConfirmedForEnabledChains,
      chainFilteredNonEvmTransactionsForSelectedChain,
    };
  }, [
    allConfirmedForEnabledChains,
    submittedTxs,
    nonEvmTransactions,
    enabledEVMChainIds,
    enabledNonEVMChainIds,
    bridgeHistory,
    relatedChainIdsByTransactionId,
  ]);

  const { data, nonEvmTransactionsForSelectedChain } = useMemo<{
    data: UnifiedItem[];
    nonEvmTransactionsForSelectedChain: NonEvmTransaction[];
  }>(() => {
    const {
      evmPendingTxs,
      evmConfirmedTxs,
      chainFilteredNonEvmTransactionsForSelectedChain,
    } = unifiedTransactionSource;

    const filteredNonEvmTransactionsForSelectedChain =
      filterMultichainTransactionsExcludingMaliciousTokenActivity(
        chainFilteredNonEvmTransactionsForSelectedChain,
        maliciousTokenKeys,
      );

    const mergedData = mergeTransactionsByTime(
      evmPendingTxs,
      evmConfirmedTxs,
      filteredNonEvmTransactionsForSelectedChain,
    );

    return {
      data: mergedData,
      nonEvmTransactionsForSelectedChain:
        filteredNonEvmTransactionsForSelectedChain,
    };
  }, [unifiedTransactionSource, maliciousTokenKeys]);

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
        RPC,
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
    if (isFetchingNextPage) {
      return (
        <View style={tw.style('items-center justify-center py-4')}>
          <ActivityIndicator />
        </View>
      );
    }

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
    isFetchingNextPage,
    showNonEvmExplorerLink,
    showNonEvmFooter,
    configBlockExplorerUrl,
    tw,
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const {
    speedUpIsOpen,
    cancelIsOpen,
    confirmDisabled,
    existingTx,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
    signQRTransaction,
    signLedgerTransaction,
    cancelUnsignedQRTransaction,
  } = useUnifiedTxActions();
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([updateIncomingTransactions(), refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleActivityItemPress = useCallback(
    (item: ActivityListItem) => {
      const { raw } = item;
      if (!raw) return;

      const itemBridgeHistoryItem = getBridgeHistoryItemByHash(item.data.hash);
      const actionKey = resolveActivityListItemTitle(
        item,
        itemBridgeHistoryItem
          ? getSwapBridgeTxActivityTitle(itemBridgeHistoryItem)
          : undefined,
      );

      const selectedEvmAddress =
        selectedAccountGroupEvmAddress ||
        selectedInternalAccount?.address ||
        '';

      if (raw.type === 'keyringTransaction') {
        const { from, to } = getActivityFromTo(item);
        const value = getActivityValue(item);
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
          params: {
            transaction: raw.data,
            displayData: {
              title: actionKey,
              from: from
                ? { address: from, amount: value ?? '', unit: '' }
                : undefined,
              to: to
                ? { address: to, amount: value ?? '', unit: '' }
                : undefined,
              isRedeposit: false,
            },
          },
        });
        return;
      }

      const tx =
        raw.type === 'apiEvmTransaction'
          ? selectedEvmAddress
            ? normalizeTransaction(selectedEvmAddress, raw.data)
            : undefined
          : raw.data.primaryTransaction;

      if (!tx) return;

      if (
        raw.type === 'localTransaction' &&
        tx.type === TransactionType.bridge
      ) {
        const persistedActionId = (tx as unknown as { actionId?: string })
          .actionId;
        const bridgeTxHistoryItem =
          bridgeHistory[tx.id] ??
          (persistedActionId ? bridgeHistory[persistedActionId] : undefined) ??
          Object.values(bridgeHistory).find(
            (itemValue) =>
              (itemValue as unknown as { originalTransactionId?: string })
                .originalTransactionId === tx.id,
          );

        handleUnifiedSwapsTxHistoryItemClick({
          navigation,
          evmTxMeta: tx,
          bridgeTxHistoryItem,
        });
        return;
      }

      const { from, to } = getActivityFromTo(item);
      const value = getActivityValue(item);

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TRANSACTION_DETAILS,
        params: {
          tx,
          transactionElement: {
            actionKey,
            value,
          },
          transactionDetails: {
            hash: item.data.hash,
            renderFrom: from,
            renderTo: to,
            renderValue: value,
            transactionType: item.type,
            txChainId: tx.chainId,
          },
          showSpeedUpModal: noop,
          showCancelModal: noop,
        },
      });
    },
    [
      bridgeHistory,
      getBridgeHistoryItemByHash,
      navigation,
      selectedAccountGroupEvmAddress,
      selectedInternalAccount?.address,
    ],
  );

  const lastConfirmedEvmIndex = useMemo(() => {
    for (let index = data.length - 1; index >= 0; index -= 1) {
      if (data[index].kind === TransactionKind.ConfirmedEvm) {
        return index;
      }
    }

    return -1;
  }, [data]);

  const lastConfirmedEvmKey =
    lastConfirmedEvmIndex >= 0
      ? generateKey(data[lastConfirmedEvmIndex])
      : undefined;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<UnifiedItem>[] }) => {
      if (
        !hasNextPage ||
        isFetchingNextPage ||
        !lastConfirmedEvmKey ||
        lastConfirmedEvmIndex < 0
      ) {
        return;
      }

      const prefetchIndex = Math.max(
        lastConfirmedEvmIndex - confirmedEvmOverscan,
        0,
      );
      const isNearPrefetchThreshold = viewableItems.some(
        ({ index }) => typeof index === 'number' && index >= prefetchIndex,
      );

      if (!isNearPrefetchThreshold) {
        return;
      }

      fetchNextPage();
    },
    [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      lastConfirmedEvmIndex,
      lastConfirmedEvmKey,
    ],
  );
  const listRef = useRef<FlashListRef<UnifiedItem>>(null);

  // Auto-scroll to top when new transactions are added
  const { handleScroll } = useTransactionAutoScroll(data, listRef, {
    keyExtractor: generateKey,
  });

  const renderEmptyList = () => (
    <View style={styles.emptyList}>
      <TabEmptyState description={strings('wallet.no_transactions')} />
    </View>
  );

  const renderInitialLoading = () => (
    <View style={styles.emptyList}>
      <ActivityIndicator color={colors.icon.default} />
    </View>
  );

  const shouldShowTransactionList = !isInitialLoading && data.length > 0;
  const items = shouldShowTransactionList ? data : [];

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
          selectedAddress={
            selectedAccountGroupEvmAddress || selectedInternalAccount?.address
          }
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
          location={location}
        />
      );
    }

    if (item.kind === TransactionKind.ConfirmedEvm) {
      if (renderActivityListItemRow) {
        const selectedEvmAddress =
          selectedAccountGroupEvmAddress ||
          selectedInternalAccount?.address ||
          '';
        const activityItem = mapApiEvmTransactions({
          subjectAddress: selectedEvmAddress.toLowerCase(),
          transaction: item.tx,
        });
        const bridgeHistoryItem = getBridgeHistoryItemByHash(
          activityItem.data.hash,
        );
        const title = bridgeHistoryItem
          ? getSwapBridgeTxActivityTitle(bridgeHistoryItem)
          : undefined;

        return (
          <ActivityListItemRow
            item={activityItem}
            index={index}
            onPress={handleActivityItemPress}
            title={title}
          />
        );
      }

      return (
        <TransactionElement
          tx={item.tx.transactionMeta}
          i={index}
          navigation={navigation}
          txChainId={item.tx.hexChainId}
          selectedAddress={
            selectedAccountGroupEvmAddress || selectedInternalAccount?.address
          }
          currentCurrency={currentCurrency}
          showBottomBorder
          location={location}
        />
      );
    }

    // Render non-EVM transactions
    const srcTxHash = item.tx.id; // id is unique for multichain tx
    const bridgeHistoryItem = getBridgeHistoryItemByHash(srcTxHash);

    if (renderActivityListItemRow) {
      const activityItem = mapKeyringTransaction({ transaction: item.tx });
      const title = bridgeHistoryItem
        ? getSwapBridgeTxActivityTitle(bridgeHistoryItem)
        : undefined;

      return (
        <ActivityListItemRow
          item={activityItem}
          index={index}
          onPress={handleActivityItemPress}
          title={title}
        />
      );
    }

    return bridgeHistoryItem ? (
      <MultichainBridgeTransactionListItem
        transaction={item.tx}
        bridgeHistoryItem={bridgeHistoryItem}
        navigation={navigation}
        index={index}
        location={location}
        showDestinationPerspective={
          !enabledNonEVMChainIds.includes(item.tx.chain)
        }
      />
    ) : (
      <MultichainTransactionListItem
        transaction={item.tx}
        navigation={navigation}
        index={index}
        // Use the transaction's chain property for non-EVM transactions (contains CAIP chainId)
        chainId={item.tx.chain as unknown as SupportedCaipChainId}
        location={location}
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
              data={items}
              testID={UnifiedTransactionsViewSelectorsIDs.CONTAINER}
              renderItem={renderItem}
              keyExtractor={generateKey}
              ListHeaderComponent={header}
              ListEmptyComponent={
                isInitialLoading ? renderInitialLoading : renderEmptyList
              }
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
              onScroll={handleScroll}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={visibilityConfig}
              scrollEventThrottle={16}
              scrollEnabled={!isChartBeingTouched}
            />
          )}
        </PriceChartContext.Consumer>
        {/* Speed up / Cancel modals*/}
        <CancelSpeedupModal
          isVisible={speedUpIsOpen || cancelIsOpen}
          isCancel={cancelIsOpen}
          tx={existingTx}
          onConfirm={cancelIsOpen ? cancelTransaction : speedUpTransaction}
          onClose={onSpeedUpCancelCompleted}
          confirmDisabled={confirmDisabled}
        />
      </View>
    </PriceChartProvider>
  );
};

export default UnifiedTransactionsView;
