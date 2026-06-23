import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { numberToHex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Routes from '../../../constants/navigation/Routes';
import { RPC } from '../../../constants/network';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../selectors/multichain/multichain';
import { selectSelectedAccountGroupInternalAccounts } from '../../../selectors/multichainAccounts/accountTreeController';
import {
  selectAllConfiguredEvmChainIds,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import { selectAllConfiguredNonEvmChainIds } from '../../../selectors/multichainNetworkController';
import { selectRelatedChainIdsByTransactionId } from '../../../selectors/transactionController';
import { baseStyles } from '../../../styles/common';
import { isHardwareAccount } from '../../../util/address';
import {
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
} from '../../../util/networks';
import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
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
import TransactionsFooter from '../../UI/Transactions/TransactionsFooter';
import ListItem from '../../Base/ListItem';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import MultichainTransactionsFooter from '../MultichainTransactionsView/MultichainTransactionsFooter';
import { getAddressUrl } from '../../../core/Multichain/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { CancelSpeedupModal } from '../confirmations/components/modals/cancel-speedup-modal';
import styleSheet from './ActivityList.styles';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { useTransactionAutoScroll } from './useTransactionAutoScroll';
import useBlockExplorer from '../../hooks/useBlockExplorer';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
import { ActivityListSelectorsIDs } from './ActivityList.testIds';
import { useMultichainActivityMaliciousTokenKeys } from '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys';
import { filterMultichainTransactionsExcludingMaliciousTokenActivity } from '../../../util/multichain/multichainTransactionTokenScan';
import { useTransactionsQuery } from './useTransactionsQuery';
import { type ActivityListItem } from './types';
import {
  groupActivityListItems,
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
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
import { getIntlDateTimeFormatter } from '../../../util/intl';

const confirmedEvmOverscan = 5;
const visibilityConfig = { itemVisiblePercentThreshold: 1 };

const updateIncomingTransactions = () =>
  (
    Engine.context.TransactionController as unknown as {
      updateIncomingTransactions: () => Promise<void>;
    }
  ).updateIncomingTransactions();

const generateKey = (item: ActivityListItem): string => {
  const hash = item.hash;
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

const isSameLocalDay = (date: Date, otherDate: Date) =>
  date.getFullYear() === otherDate.getFullYear() &&
  date.getMonth() === otherDate.getMonth() &&
  date.getDate() === otherDate.getDate();

const formatDateHeader = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) {
    return strings('perps.today');
  }

  if (isSameLocalDay(date, yesterday)) {
    return strings('perps.yesterday');
  }

  return getIntlDateTimeFormatter('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const noop = () => undefined;

const getBlockExplorerTrackingText = (url: string, fallbackName?: string) => {
  const blockExplorerName = getBlockExplorerName(url) ?? fallbackName;
  const prefix = strings('transactions.view_full_history_on');

  return blockExplorerName ? `${prefix} ${blockExplorerName}` : prefix;
};

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

interface ActivityListProps {
  header?: React.ReactElement;
  tabLabel?: string;
  chainId?: string; // used by non-EVM list items for explorer links
  location?: TransactionDetailLocation;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const ActivityList = ({
  header,
  chainId,
  location,
  onScroll,
}: ActivityListProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors } = useTheme();
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();

  const getBridgeHistoryItemByHash = useCallback(
    (hash?: string) => {
      if (!hash) {
        return undefined;
      }

      const normalizedHash = hash.toLowerCase();
      return (
        bridgeHistoryItemsBySrcTxHash[hash] ??
        Object.entries(bridgeHistoryItemsBySrcTxHash).find(
          ([key]) => key.toLowerCase() === normalizedHash,
        )?.[1]
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

  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedAccountGroupInternalAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const isQRHardwareAccount = useMemo(
    () =>
      isHardwareAccount(selectedInternalAccount?.address ?? '', [
        ExtendedKeyringTypes.qr,
      ]),
    [selectedInternalAccount?.address],
  );
  const isLedgerAccount = useMemo(
    () =>
      isHardwareAccount(selectedInternalAccount?.address ?? '', [
        ExtendedKeyringTypes.ledger,
      ]),
    [selectedInternalAccount?.address],
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

  // All configured networks (not "enabled"): the Activity feed shows every
  // network the account has, decoupled from NetworkEnablementController so a
  // single-network enable/disable (e.g. Predict enabling Polygon) can't
  // collapse the list to one network.
  const configuredEVMChainIds = useSelector(selectAllConfiguredEvmChainIds);
  const configuredNonEVMChainIds = useSelector(
    selectAllConfiguredNonEvmChainIds,
  );

  const relatedChainIdsByTransactionId = useSelector(
    selectRelatedChainIdsByTransactionId,
  );

  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  /** Drop confirmed EVM rows not on a configured chain (guards stale query pages / removed networks). */
  const allConfirmedForConfiguredChains = useMemo<ActivityListItem[]>(() => {
    const chains = configuredEVMChainIds ?? [];
    if (chains.length === 0) return [];
    const allowed = new Set(chains.map((c) => c.toLowerCase()));
    return allConfirmedFiltered.filter((item) => {
      // chainId is a CaipChainId like eip155:1 — extract hex part
      const hexChainId = item.chainId.split(':')[1];
      if (!hexChainId) return false;
      const hexFormatted = `0x${parseInt(hexChainId, 10).toString(16)}`;
      return allowed.has(hexFormatted.toLowerCase());
    });
  }, [allConfirmedFiltered, configuredEVMChainIds]);

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
    const configuredEvmSet = new Set(
      (configuredEVMChainIds ?? []).map((id) => id.toLowerCase()),
    );

    // Filter local items to configured EVM chains only, also deduplicate against confirmed
    const confirmedHashes = new Set(
      allConfirmedForConfiguredChains
        .map((item) => item.hash?.toLowerCase())
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

      if (!relatedChainIds.some((id) => configuredEvmSet.has(id))) {
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
          const matchedByNonce = allConfirmedForConfiguredChains.some(
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

    // Non-EVM: filter to configured chains, include bridge txns whose dest chain is configured
    const seenNonEvmTransactionIds = new Set<string>();
    const filteredNonEvmTransactions = nonEvmTransactions.reduce<
      typeof nonEvmTransactions
    >((filtered, tx) => {
      if (seenNonEvmTransactionIds.has(tx.id)) {
        return filtered;
      }

      const includeTransaction = (() => {
        if (configuredNonEVMChainIds.includes(tx.chain)) return true;
        const bridge = Object.values(bridgeHistory ?? {}).find(
          (item) => item.status?.srcChain?.txHash === tx.id,
        );
        return (
          bridge?.quote?.destChainId !== undefined &&
          configuredEVMChainIds.includes(numberToHex(bridge.quote.destChainId))
        );
      })();

      if (includeTransaction) {
        seenNonEvmTransactionIds.add(tx.id);
        filtered.push(tx);
      }

      return filtered;
    }, []);

    const filteredNonEvmForMalicious =
      filterMultichainTransactionsExcludingMaliciousTokenActivity(
        filteredNonEvmTransactions,
        maliciousTokenKeys,
      );

    const nonEvmItems = mapNonEvmTransactions(filteredNonEvmForMalicious);

    return {
      localItems: filteredLocalItems,
      confirmedEvmItems: allConfirmedForConfiguredChains,
      nonEvmItems,
    };
  }, [
    allConfirmedForConfiguredChains,
    localActivityItems,
    nonEvmTransactions,
    configuredEVMChainIds,
    configuredNonEVMChainIds,
    bridgeHistory,
    relatedChainIdsByTransactionId,
    maliciousTokenKeys,
  ]);

  const data = useMemo<ActivityListItem[]>(() => {
    const { localItems, confirmedEvmItems, nonEvmItems } =
      unifiedTransactionSource;
    return mergeTransactionsByTime(localItems, confirmedEvmItems, nonEvmItems);
  }, [unifiedTransactionSource]);
  const groupedData = useMemo(() => groupActivityListItems(data), [data]);

  const hasConfiguredEvmChains = configuredEVMChainIds.length > 0;
  const popularListBlockExplorer = useBlockExplorer(
    hasConfiguredEvmChains ? configuredEVMChainIds[0] : undefined,
  );

  const configBlockExplorerUrl = useMemo(() => {
    if (!configuredEVMChainIds?.length || configuredEVMChainIds.length !== 1) {
      return undefined;
    }
    const selectedChainId = configuredEVMChainIds[0];
    const config = evmNetworkConfigurationsByChainId?.[selectedChainId];
    if (!config) return undefined;
    const index = config.defaultBlockExplorerUrlIndex ?? 0;
    return config.blockExplorerUrls?.[index];
  }, [configuredEVMChainIds, evmNetworkConfigurationsByChainId]);

  const blockExplorerUrl = useMemo(() => {
    if (configBlockExplorerUrl) {
      return configBlockExplorerUrl;
    }
    return hasConfiguredEvmChains
      ? popularListBlockExplorer.getBlockExplorerUrl(
          selectedAccountGroupEvmAddress,
        ) || undefined
      : undefined;
  }, [
    configBlockExplorerUrl,
    popularListBlockExplorer,
    selectedAccountGroupEvmAddress,
    hasConfiguredEvmChains,
  ]);

  const hasConfiguredNonEvmChains = configuredNonEVMChainIds.length > 0;

  const showEvmFooter = hasConfiguredEvmChains && !hasConfiguredNonEvmChains;
  const showNonEvmFooter = hasConfiguredNonEvmChains && !hasConfiguredEvmChains;

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
      title = hasConfiguredEvmChains
        ? popularListBlockExplorer.getBlockExplorerName(
            configuredEVMChainIds[0],
          )
        : undefined;
    }

    if (!url) {
      return;
    }

    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'activity_tab',
      text: getBlockExplorerTrackingText(url, title),
      url,
    });

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url, title },
    });
  }, [
    navigation,
    blockExplorerUrl,
    selectedAccountGroupEvmAddress,
    popularListBlockExplorer,
    configuredEVMChainIds,
    configBlockExplorerUrl,
    hasConfiguredEvmChains,
    trackEvent,
    createEventBuilder,
  ]);

  const allNonEvmChainsAreSolana = useMemo(
    () =>
      configuredNonEVMChainIds.every((chain) =>
        chain.toLowerCase().startsWith('solana:'),
      ),
    [configuredNonEVMChainIds],
  );

  const nonEvmExplorerChainId = useMemo(() => {
    if (configuredNonEVMChainIds.length) return configuredNonEVMChainIds[0];
    if (chainId?.includes(':')) return chainId;
    return undefined;
  }, [configuredNonEVMChainIds, chainId]);

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
    if (!nonEvmExplorerUrl) return;
    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'activity_tab',
      text: getBlockExplorerTrackingText(nonEvmExplorerUrl),
      url: nonEvmExplorerUrl,
    });
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url: nonEvmExplorerUrl },
    });
  }, [navigation, nonEvmExplorerUrl, trackEvent, createEventBuilder]);

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
          chainId={configuredEVMChainIds[0]}
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
    configuredEVMChainIds,
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
      await Promise.all([updateIncomingTransactions(), refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleActivityItemPress = useCallback(
    (item: ActivityListItem) => {
      const { raw } = item;
      if (!raw) return;

      const itemBridgeHistoryItem = getBridgeHistoryItemByHash(item.hash);
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
        const bridgeTxHistoryItem =
          bridgeHistory[tx.id] ??
          (tx.actionId ? bridgeHistory[tx.actionId] : undefined) ??
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
            hash: item.hash,
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
    for (let index = groupedData.length - 1; index >= 0; index -= 1) {
      const item = groupedData[index];
      if (item.type === 'item' && item.item.raw?.type === 'apiEvmTransaction') {
        return index;
      }
    }
    return -1;
  }, [groupedData]);

  const lastConfirmedEvmKey =
    lastConfirmedEvmIndex >= 0
      ? generateGroupedKey(groupedData[lastConfirmedEvmIndex])
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

  const listRef = useRef<FlashListRef<GroupedActivityListItem>>(null);

  const { handleScroll } = useTransactionAutoScroll(groupedData, listRef, {
    keyExtractor: generateGroupedKey,
  });

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll();
      onScroll?.(event);
    },
    [handleScroll, onScroll],
  );

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
  const items = shouldShowTransactionList ? groupedData : [];

  const renderItem = ({
    item: groupedItem,
    index,
  }: {
    item: GroupedActivityListItem;
    index: number;
  }) => {
    if (groupedItem.type === 'pending-header') {
      return (
        <ListItem.Date style={styles.dateHeader}>
          {strings('transaction.pending')}
        </ListItem.Date>
      );
    }

    if (groupedItem.type === 'date-header') {
      return (
        <ListItem.Date style={styles.dateHeader}>
          {formatDateHeader(groupedItem.date)}
        </ListItem.Date>
      );
    }

    const { item } = groupedItem;
    const raw = item.raw;

    // Non-EVM bridge transactions: route to MultichainBridgeTransactionListItem.
    if (raw?.type === 'keyringTransaction') {
      const srcTxHash = raw.data.id;
      const bridgeHistoryItem = getBridgeHistoryItemByHash(srcTxHash);
      if (bridgeHistoryItem) {
        return (
          <MultichainBridgeTransactionListItem
            transaction={raw.data}
            bridgeHistoryItem={bridgeHistoryItem}
            navigation={navigation}
            index={index}
            location={location}
            showDestinationPerspective={
              !configuredNonEVMChainIds.includes(raw.data.chain)
            }
          />
        );
      }
    }

    // All other items (API EVM confirmed, completed local EVM, non-EVM non-bridge,
    // and pending local/remote rows):
    // render from the shared ActivityListItem shape.
    //
    // Preserve the legacy Activity title for swap/bridge rows (e.g.
    // "Swap ETH to USDC", "Bridge to Optimism") by deriving it from bridge
    // history. Falls back to the kind-based title.
    const bridgeHistoryItem = getBridgeHistoryItemByHash(item.hash);
    const title = bridgeHistoryItem
      ? getSwapBridgeTxActivityTitle(bridgeHistoryItem)
      : undefined;

    return (
      <ActivityListItemRow
        bridgeHistoryItem={bridgeHistoryItem}
        item={item}
        index={index}
        onPress={handleActivityItemPress}
        title={title}
        isQRHardwareAccount={isQRHardwareAccount}
        isLedgerAccount={isLedgerAccount}
        onSpeedUpAction={onSpeedUpAction}
        onCancelAction={onCancelAction}
        signQRTransaction={signQRTransaction}
        signLedgerTransaction={signLedgerTransaction}
        cancelUnsignedQRTransaction={cancelUnsignedQRTransaction}
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
              testID={ActivityListSelectorsIDs.CONTAINER}
              renderItem={renderItem}
              keyExtractor={generateGroupedKey}
              ListHeaderComponent={header}
              ListEmptyComponent={
                isInitialLoading ? renderInitialLoading : renderEmptyList
              }
              ListFooterComponent={footerComponent}
              style={baseStyles.flexGrow}
              contentContainerStyle={tw.style('px-4 pb-8')}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary.default]}
                  tintColor={colors.icon.default}
                />
              }
              onScroll={handleListScroll}
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

export default ActivityList;
