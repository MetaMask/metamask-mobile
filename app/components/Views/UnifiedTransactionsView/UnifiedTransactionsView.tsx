import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { numberToHex, type Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
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
  selectPopularNetworkConfigurationsByCaipChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import {
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from '../../../selectors/networkEnablementController';
import { selectRelatedChainIdsByTransactionId } from '../../../selectors/transactionController';
import { baseStyles } from '../../../styles/common';
import { areAddressesEqual, isHardwareAccount } from '../../../util/address';
import {
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
} from '../../../util/networks';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
import { useTheme } from '../../../util/theme';
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
  groupActivityListItems,
  type ActivityListItem,
  type GroupedActivityListItem,
} from '../../../util/activity-adapters';
import {
  isBridgeHistoryForEvmTransaction,
  mergeTransactionsByTime,
  mapNonEvmTransactions,
} from './helpers/transformations';
import { normalizeTransaction } from './helpers/adapters';
import { useLocalActivityItems } from './hooks/useLocalActivityItems';
import {
  ActivityListItemRow,
  resolveActivityListItemTitle,
} from '../../UI/ActivityListItemRow/ActivityListItemRow';

const confirmedEvmOverscan = 5;
const visibilityConfig = { itemVisiblePercentThreshold: 1 };

const generateKey = (item: ActivityListItem): string => {
  const hash = item.data.hash;
  if (hash) {
    return `${item.chainId}:${hash}`;
  }
  return `${item.chainId}:${item.timestamp}:${item.type}`;
};

const generateGroupedKey = (item: GroupedActivityListItem): string => {
  if (item.type === 'pending-header') {
    return 'pending-header';
  }

  if (item.type === 'date-header') {
    return `date-header-${item.date}`;
  }

  return generateKey(item.item);
};

const formatDateHeader = (timestamp: number): string =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));

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

interface UnifiedTransactionsViewProps {
  header?: React.ReactElement;
  tabLabel?: string;
  chainId?: string; // used by non-EVM list items for explorer links
  location?: TransactionDetailLocation;
}

const UnifiedTransactionsView = ({
  header,
  chainId,
  location,
}: UnifiedTransactionsViewProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
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

  const allConfirmedFiltered = useMemo<ActivityListItem[]>(
    () => evmTransactions?.pages.flatMap((page) => page.data) ?? [],
    [evmTransactions],
  );

  // Local EVM transactions mapped through the shared adapter
  const localActivityItems = useLocalActivityItems();

  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );
  const nonEvmTransactions = useMemo(
    () => nonEvmState?.transactions ?? [],
    [nonEvmState?.transactions],
  );

  const currentCurrency = useSelector(selectCurrentCurrency);

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
  const popularNetworkConfigurations = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );
  const activeEVMChainIds = useMemo(() => {
    const popularEVMChainIds = popularNetworkConfigurations
      .map((network) => network.chainId)
      .filter((networkChainId): networkChainId is Hex =>
        networkChainId.startsWith('0x'),
      );
    const enabledEVMChainIdSet = new Set(enabledEVMChainIds);
    const areAllPopularEvmNetworksEnabled =
      popularEVMChainIds.length > 0 &&
      popularEVMChainIds.every((networkChainId) =>
        enabledEVMChainIdSet.has(networkChainId),
      );

    return areAllPopularEvmNetworksEnabled
      ? popularEVMChainIds
      : enabledEVMChainIds;
  }, [enabledEVMChainIds, popularNetworkConfigurations]);
  const enabledNonEVMNetworks = useSelector(selectNonEVMEnabledNetworks);
  const enabledNonEVMChainIds = useMemo(
    () => enabledNonEVMNetworks ?? [],
    [enabledNonEVMNetworks],
  );

  const relatedChainIdsByTransactionId = useSelector(
    selectRelatedChainIdsByTransactionId,
  );

  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  /** Drop confirmed EVM rows not on currently enabled chains (guards stale query pages). */
  const allConfirmedForEnabledChains = useMemo<ActivityListItem[]>(() => {
    const chains = activeEVMChainIds ?? [];
    if (chains.length === 0) return [];
    const allowed = new Set(chains.map((c) => c.toLowerCase()));
    return allConfirmedFiltered.filter((item) => {
      // chainId is a CaipChainId like eip155:1 — extract hex part
      const hexChainId = item.chainId.split(':')[1];
      if (!hexChainId) return false;
      const hexFormatted = `0x${parseInt(hexChainId, 10).toString(16)}`;
      return allowed.has(hexFormatted.toLowerCase());
    });
  }, [allConfirmedFiltered, activeEVMChainIds]);

  const { maliciousTokenKeys } =
    useMultichainActivityMaliciousTokenKeys(nonEvmTransactions);

  const providerType = useSelector(selectProviderType);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const unifiedTransactionSource = useMemo<{
    localItems: ActivityListItem[];
    confirmedEvmItems: ActivityListItem[];
    nonEvmItems: ActivityListItem[];
  }>(() => {
    const bridgeHistoryValues = Object.values(bridgeHistory ?? {});
    const enabledEvmSet = new Set(
      (activeEVMChainIds ?? []).map((id) => id.toLowerCase()),
    );

    // Filter local items to enabled EVM chains only, also deduplicate against confirmed
    const confirmedHashes = new Set(
      allConfirmedForEnabledChains
        .map((item) => item.data.hash?.toLowerCase())
        .filter(Boolean) as string[],
    );

    // localActivityItems are already mapped from TransactionMeta via the adapter;
    // here we apply the same chain-filter and EVM-confirmed dedup that existed before.
    const filteredLocalItems = localActivityItems.filter((item) => {
      const raw = item.raw;
      if (raw?.type !== 'localTransaction') return true;
      const tx = raw.data.primaryTransaction;

      const txChainId = tx.chainId?.toLowerCase() ?? '';
      const relatedChainIds = relatedChainIdsByTransactionId.get(tx.id) ?? [
        txChainId,
      ];

      if (!relatedChainIds.some((id) => enabledEvmSet.has(id))) {
        return false;
      }

      // Dedup against confirmed by hash — bridge txns are exempt from nonce dedup
      const hash = tx.hash?.toLowerCase();
      if (hash && confirmedHashes.has(hash)) return false;

      // Nonce dedup: skip local if a confirmed tx has the same nonce+from+chain
      // (bridge txns exempt, as they may have same nonce as their approval)
      const isBridgeTx = isBridgeHistoryForEvmTransaction(
        tx,
        bridgeHistoryValues,
      );
      if (!isBridgeTx) {
        const nonce = tx.txParams?.nonce;
        const from = tx.txParams?.from?.toLowerCase();
        if (nonce !== undefined && nonce !== null && from) {
          const matchedByNonce = allConfirmedForEnabledChains.some(
            (confirmed) => {
              // parse nonce from confirmed item if available
              const confirmedRaw = confirmed.raw;
              if (confirmedRaw?.type !== 'apiEvmTransaction') return false;
              const confirmedApiTx = confirmedRaw.data;
              // hexChainId from caip: eip155:1 → 0x1
              const hexChainId = confirmed.chainId.split(':')[1]
                ? `0x${parseInt(confirmed.chainId.split(':')[1], 10).toString(16)}`
                : '';
              return (
                confirmedApiTx.nonce === parseInt(String(nonce), 16) &&
                hexChainId.toLowerCase() === txChainId &&
                confirmedApiTx.from?.toLowerCase() === from
              );
            },
          );
          if (matchedByNonce) return false;
        }
      }

      return true;
    });

    // Non-EVM: filter by enabled chains, include bridge txns whose dest chain is enabled
    const filteredNonEvmTransactions = nonEvmTransactions
      .filter((tx) => {
        if (enabledNonEVMChainIds.includes(tx.chain)) return true;
        const bridge = Object.values(bridgeHistory ?? {}).find(
          (item) => item.status?.srcChain?.txHash === tx.id,
        );
        return (
          bridge?.quote?.destChainId !== undefined &&
          activeEVMChainIds.includes(numberToHex(bridge.quote.destChainId))
        );
      })
      .filter(
        (tx, index, self) => index === self.findIndex((t) => t.id === tx.id),
      );

    const filteredNonEvmForMalicious =
      filterMultichainTransactionsExcludingMaliciousTokenActivity(
        filteredNonEvmTransactions,
        maliciousTokenKeys,
      );

    const nonEvmItems = mapNonEvmTransactions(filteredNonEvmForMalicious);

    return {
      localItems: filteredLocalItems,
      confirmedEvmItems: allConfirmedForEnabledChains,
      nonEvmItems,
    };
  }, [
    allConfirmedForEnabledChains,
    localActivityItems,
    nonEvmTransactions,
    activeEVMChainIds,
    enabledNonEVMChainIds,
    bridgeHistory,
    relatedChainIdsByTransactionId,
    maliciousTokenKeys,
  ]);

  const data = useMemo<ActivityListItem[]>(() => {
    const { localItems, confirmedEvmItems, nonEvmItems } =
      unifiedTransactionSource;
    return mergeTransactionsByTime(localItems, confirmedEvmItems, nonEvmItems);
  }, [unifiedTransactionSource]);

  const hasEvmChainsEnabled = enabledEVMChainIds.length > 0;
  const popularListBlockExplorer = useBlockExplorer(
    hasEvmChainsEnabled ? enabledEVMChainIds[0] : undefined,
  );

  const configBlockExplorerUrl = useMemo(() => {
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
      if (!url) return;
    } else {
      url = blockExplorerUrl;
      title = hasEvmChainsEnabled
        ? popularListBlockExplorer.getBlockExplorerName(enabledEVMChainIds[0])
        : undefined;
    }

    if (!url) {
      return;
    }

    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'activity_tab',
      text: title
        ? `${strings('transactions.view_full_history_on')} ${title}`
        : strings('asset_details.options.view_on_block'),
      url,
    });

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url, title },
    });
  }, [
    createEventBuilder,
    navigation,
    blockExplorerUrl,
    trackEvent,
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
    if (enabledNonEVMChainIds.length) return enabledNonEVMChainIds[0];
    if (chainId?.includes(':')) return chainId;
    return undefined;
  }, [enabledNonEVMChainIds, chainId]);

  const nonEvmExplorerUrl = useMemo(() => {
    if (!selectedAccountGroupSolanaAddress || !nonEvmExplorerChainId) return '';
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

    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'activity_tab',
      text: `${strings('transactions.view_full_history_on')} ${getBlockExplorerName(nonEvmExplorerUrl)}`,
      url: nonEvmExplorerUrl,
    });

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url: nonEvmExplorerUrl },
    });
  }, [createEventBuilder, navigation, nonEvmExplorerUrl, trackEvent]);

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
            (unifiedTransactionSource.nonEvmItems?.length ?? 0) > 0
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
    unifiedTransactionSource.nonEvmItems?.length,
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
      await refetch();
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

  // Index of the last API-confirmed EVM item — used to trigger pagination.
  const lastConfirmedEvmIndex = useMemo(() => {
    for (let index = data.length - 1; index >= 0; index -= 1) {
      const item = data[index];
      if (item.raw?.type === 'apiEvmTransaction') {
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
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<GroupedActivityListItem>[];
    }) => {
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

      if (!isNearPrefetchThreshold) return;
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

  const shouldShowTransactionList = !isInitialLoading && data.length > 0;
  const items = useMemo(
    () => (shouldShowTransactionList ? groupActivityListItems(data) : []),
    [data, shouldShowTransactionList],
  );

  const listRef = useRef<FlashListRef<GroupedActivityListItem>>(null);

  const { handleScroll } = useTransactionAutoScroll(items, listRef, {
    keyExtractor: generateGroupedKey,
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

  const renderItem = ({
    item,
    index,
  }: {
    item: GroupedActivityListItem;
    index: number;
  }) => {
    if (item.type === 'pending-header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>
            {strings('transaction.pending')}
          </Text>
        </View>
      );
    }

    if (item.type === 'date-header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>
            {formatDateHeader(item.date)}
          </Text>
        </View>
      );
    }

    const activityItem = item.item;
    const raw = activityItem.raw;

    // Pending local EVM transactions: route to TransactionElement for speed-up/cancel UI.
    if (raw?.type === 'localTransaction' && activityItem.status === 'pending') {
      const tx = raw.data.primaryTransaction;
      return (
        <TransactionElement
          tx={tx}
          i={index}
          navigation={navigation}
          txChainId={tx.chainId}
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

    // Non-EVM bridge transactions: route to MultichainBridgeTransactionListItem.
    if (raw?.type === 'keyringTransaction') {
      const srcTxHash = raw.data.id;
      const bridgeHistoryItem = bridgeHistoryItemsBySrcTxHash[srcTxHash];
      if (bridgeHistoryItem) {
        return (
          <MultichainBridgeTransactionListItem
            transaction={raw.data}
            bridgeHistoryItem={bridgeHistoryItem}
            navigation={navigation}
            index={index}
            location={location}
            showDestinationPerspective={
              !enabledNonEVMChainIds.includes(raw.data.chain)
            }
          />
        );
      }
    }

    // All other items (API EVM confirmed, completed local EVM, non-EVM non-bridge):
    // render from the shared ActivityListItem shape.
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
        bridgeHistoryItem={bridgeHistoryItem}
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
              keyExtractor={generateGroupedKey}
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
        {/* Speed up / Cancel modals */}
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
