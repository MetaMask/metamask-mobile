import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { numberToHex, type CaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
  type ViewToken,
} from '@shopify/flash-list';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Routes from '../../../constants/navigation/Routes';
import { RPC } from '../../../constants/network';
import { FIAT_ORDER_PROVIDERS } from '../../../constants/on-ramp';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../selectors/multichain/multichain';
import { selectSelectedAccountGroupInternalAccounts } from '../../../selectors/multichainAccounts/accountTreeController';
import {
  selectAllConfiguredEvmChainIds,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderType,
  selectTickerByChainId,
} from '../../../selectors/networkController';
import { selectAllConfiguredNonEvmChainIds } from '../../../selectors/multichainNetworkController';
import {
  selectRelatedChainIdsByTransactionId,
  selectSwapsTransactions,
} from '../../../selectors/transactionController';
import {
  selectConversionRateByChainId,
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../selectors/tokenRatesController';
import { selectPrimaryCurrency } from '../../../selectors/settings';
import { selectTokensByChainIdAndWalletAddress } from '../../../selectors/tokensController';
import { store } from '../../../store';
import decodeTransaction from '../../UI/TransactionElement/utils';
import { baseStyles } from '../../../styles/common';
import { isHardwareAccount } from '../../../util/address';
import {
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
} from '../../../util/networks';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../util/analytics/externalLinkTracking';
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
  isBridgeTxHistoryItemBridge,
} from '../../UI/Bridge/utils/transaction-history';
import TransactionsFooter from '../../UI/Transactions/TransactionsFooter';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import MultichainTransactionsFooter from '../MultichainTransactionsView/MultichainTransactionsFooter';
import { getAddressUrl } from '../../../core/Multichain/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { CancelSpeedupModal } from '../confirmations/components/modals/cancel-speedup-modal';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { hasTransactionType } from '../confirmations/utils/transaction';
import styleSheet from './ActivityList.styles';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import { useTransactionAutoScroll } from './useTransactionAutoScroll';
import useBlockExplorer from '../../hooks/useBlockExplorer';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';
import { selectIsTransactionsRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ActivityEmptyState from '../ActivityScreen/components/ActivityEmptyState';
import { ActivityListSelectorsIDs } from './ActivityList.testIds';
import { useMultichainActivityMaliciousTokenKeys } from '../../hooks/useMultichainActivityMaliciousTokenKeys/useMultichainActivityMaliciousTokenKeys';
import { filterMultichainTransactionsExcludingMaliciousTokenActivity } from '../../../util/multichain/multichainTransactionTokenScan';
import { useTransactionsQuery } from './useTransactionsQuery';
import { type ActivityListItem } from './types';
import {
  getActivityFromTo,
  getActivityValue,
  getGroupedActivityListItemKey,
  groupActivityListItems,
  isFailedOrCancelledTransfer,
  preferLocalOrApiActivityItem,
  type ActivityKind,
  type GroupedActivityListItem,
  type TransactionGroup,
} from '../../../util/activity-adapters';
import {
  isBridgeHistoryForEvmTransaction,
  mergeTransactionsByTime,
  mapNonEvmTransactions,
} from './helpers/transformations';
import { normalizeTransaction } from './helpers/adapters';
import { useLocalActivityItems } from './hooks/useLocalActivityItems';
import { getActivityDetailsRoute } from './getActivityDetailsRoute';
import { useRampActivityItems } from './hooks/useRampActivityItems';
import {
  INITIAL_PERPS_ACTIVITY_SOURCE_STATE,
  PerpsActivitySource,
  type PerpsActivitySourceState,
} from './hooks/PerpsActivitySource';
import {
  INITIAL_PREDICT_ACTIVITY_SOURCE_STATE,
  PredictActivitySource,
  type PredictActivitySourceState,
} from './hooks/PredictActivitySource';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { selectPredictEnabledFlag } from '../../UI/Predict';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { predictActivityToItem } from '../../UI/Predict/utils/predictActivityToItem';
import {
  ActivityTypeFilter,
  activityKindMatchesTypeFilter,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../ActivityScreen/types';
import {
  ActivityListItemRow,
  resolveActivityListItemTitle,
} from '../../UI/ActivityListItemRow/ActivityListItemRow';
import ActivityListDateHeader from '../../UI/ActivityListItemRow/ActivityListDateHeader';

const confirmedEvmOverscan = 5;
const visibilityConfig = { itemVisiblePercentThreshold: 1 };

type ActivityFlashListProps = FlashListProps<GroupedActivityListItem> & {
  ref?: React.Ref<FlashListRef<GroupedActivityListItem>>;
};
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<ActivityFlashListProps>,
) as unknown as React.ComponentType<ActivityFlashListProps>;

const updateIncomingTransactions = () =>
  (
    Engine.context.TransactionController as unknown as {
      updateIncomingTransactions: () => Promise<void>;
    }
  ).updateIncomingTransactions();

const generateGroupedKey = (
  item: GroupedActivityListItem,
  index: number = 0,
): string => getGroupedActivityListItemKey(item, index);

const noop = () => undefined;

const PERPS_WALLET_TX_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
];

const isPerpsWalletTransactionGroup = (group: TransactionGroup): boolean =>
  [group.primaryTransaction, group.initialTransaction].some(
    (meta) =>
      hasTransactionType(meta, PERPS_WALLET_TX_TYPES) ||
      (meta?.originalType !== undefined &&
        PERPS_WALLET_TX_TYPES.includes(meta.originalType)),
  );

const getBlockExplorerTrackingText = (url: string, fallbackName?: string) => {
  const blockExplorerName = getBlockExplorerName(url) ?? fallbackName;
  const prefix = strings('transactions.view_full_history_on');

  return blockExplorerName ? `${prefix} ${blockExplorerName}` : prefix;
};

interface ActivityListProps {
  header?: React.ReactElement;
  tabLabel?: string;
  chainId?: string; // used by non-EVM list items for explorer links
  /**
   * Shared value updated on the UI thread with the list's vertical scroll
   * offset, for driving scroll-linked animations in the parent.
   */
  scrollY?: SharedValue<number>;
  typeFilter?: ActivityTypeFilter;
  networkFilter?: CaipChainId[] | null;
  subFilterKinds?: ReadonlySet<ActivityKind>;
}

export interface ActivityListHandle {
  /** Scrolls the list back to the top (animated). */
  scrollToTop: () => void;
}

const ActivityList = forwardRef<ActivityListHandle, ActivityListProps>(
  (
    { header, chainId, scrollY, typeFilter, networkFilter, subFilterKinds },
    ref,
  ) => {
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
      isLoading: isInitialLoading,
      isFetchingNextPage,
      refetch,
    } = useTransactionsQuery();

    const allConfirmedFiltered = useMemo<ActivityListItem[]>(
      () => evmTransactions?.pages.flatMap((page) => page.data) ?? [],
      [evmTransactions],
    );

    // Local EVM transactions mapped through the shared adapter
    const localActivityItems = useLocalActivityItems();
    const rampActivityItems = useRampActivityItems();

    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const [perpsSource, setPerpsSource] = useState<PerpsActivitySourceState>(
      INITIAL_PERPS_ACTIVITY_SOURCE_STATE,
    );
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);
    const [predictSource, setPredictSource] =
      useState<PredictActivitySourceState>(
        INITIAL_PREDICT_ACTIVITY_SOURCE_STATE,
      );

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
    const isTransactionsRedesignEnabled = useSelector(
      selectIsTransactionsRedesignEnabled,
    );

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
      const confirmedItemByHash = new Map<string, ActivityListItem>();
      for (const confirmed of allConfirmedForConfiguredChains) {
        const hash = confirmed.hash?.toLowerCase();
        if (hash && !confirmedItemByHash.has(hash)) {
          confirmedItemByHash.set(hash, confirmed);
        }
      }

      const localDomainKindHashes = new Set(
        localActivityItems
          .filter(
            (item) =>
              (item.type === 'predictionsAddFunds' ||
                item.type === 'predictionsWithdrawFunds' ||
                item.type === 'deposit' ||
                item.type === 'claim' ||
                item.type === 'unstake' ||
                item.type === 'smartAccountUpgrade') &&
              item.raw?.type === 'localTransaction',
          )
          .map((item) =>
            item.raw?.type === 'localTransaction'
              ? item.raw.data.primaryTransaction.hash?.toLowerCase()
              : undefined,
          )
          .filter(Boolean) as string[],
      );

      const localWinsHashes = new Set(localDomainKindHashes);
      for (const localItem of localActivityItems) {
        if (localItem.raw?.type !== 'localTransaction') continue;
        const hash = localItem.raw.data.primaryTransaction.hash?.toLowerCase();
        if (!hash) continue;
        const confirmed = confirmedItemByHash.get(hash);
        if (!confirmed) continue;
        if (preferLocalOrApiActivityItem(localItem, confirmed) === localItem) {
          localWinsHashes.add(hash);
        }
      }

      // localActivityItems are already mapped from TransactionMeta via the adapter;
      // here we apply the same chain-filter and EVM-confirmed dedup that existed before.
      const filteredLocalItems = localActivityItems.filter((item) => {
        const raw = item.raw;
        if (raw?.type !== 'localTransaction') return true;
        const tx = raw.data.primaryTransaction;

        if (isPerpsEnabled && isPerpsWalletTransactionGroup(raw.data)) {
          return false;
        }

        const txChainId = tx.chainId?.toLowerCase() ?? '';
        const relatedChainIds = relatedChainIdsByTransactionId.get(tx.id) ?? [
          txChainId,
        ];

        if (!relatedChainIds.some((id) => configuredEvmSet.has(id))) {
          return false;
        }

        // Dedup against confirmed by hash — bridge txns are exempt from nonce dedup
        const hash = tx.hash?.toLowerCase();
        // Local copies that out-categorize their confirmed copy win over it.
        const localWins = !!hash && localWinsHashes.has(hash);
        if (hash && confirmedHashes.has(hash) && !localWins) return false;

        // Nonce dedup: skip local if a confirmed tx has the same nonce+from+chain
        // (bridge txns exempt, as they may have same nonce as their approval)
        const isBridgeTx = isBridgeHistoryForEvmTransaction(
          tx,
          bridgeHistoryValues,
        );
        if (!isBridgeTx && !localWins) {
          const nonce = tx.txParams?.nonce;
          const from = tx.txParams?.from?.toLowerCase();
          if (nonce !== undefined && nonce !== null && from) {
            const matchedByNonce = allConfirmedForConfiguredChains.some(
              (confirmed) => {
                const confirmedRaw = confirmed.raw;
                if (confirmedRaw?.type !== 'apiEvmTransaction') return false;
                const confirmedApiTx = confirmedRaw.data;
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
      const filteredNonEvmTransactions = nonEvmTransactions
        .filter((tx) => {
          if (configuredNonEVMChainIds.includes(tx.chain)) return true;
          const bridge = Object.values(bridgeHistory ?? {}).find(
            (item) => item.status?.srcChain?.txHash === tx.id,
          );
          return (
            bridge?.quote?.destChainId !== undefined &&
            configuredEVMChainIds.includes(
              numberToHex(bridge.quote.destChainId),
            )
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

      const nonEvmItems = mapNonEvmTransactions(
        filteredNonEvmForMalicious,
        getBridgeHistoryItemByHash,
      );

      // Drop confirmed copies whose local copy won above, so the winning local
      // copy isn't rendered alongside a duplicate confirmed row.
      const confirmedEvmItems =
        localWinsHashes.size === 0
          ? allConfirmedForConfiguredChains
          : allConfirmedForConfiguredChains.filter((item) => {
              const hash = item.hash?.toLowerCase();
              return !(hash && localWinsHashes.has(hash));
            });

      return {
        localItems: filteredLocalItems,
        confirmedEvmItems,
        nonEvmItems,
      };
    }, [
      allConfirmedForConfiguredChains,
      localActivityItems,
      nonEvmTransactions,
      configuredEVMChainIds,
      configuredNonEVMChainIds,
      bridgeHistory,
      getBridgeHistoryItemByHash,
      relatedChainIdsByTransactionId,
      maliciousTokenKeys,
      isPerpsEnabled,
    ]);

    const data = useMemo<ActivityListItem[]>(() => {
      const { localItems, confirmedEvmItems, nonEvmItems } =
        unifiedTransactionSource;
      const merged = mergeTransactionsByTime(
        localItems,
        confirmedEvmItems,
        nonEvmItems,
        isPerpsEnabled ? perpsSource.items : [],
        isPredictEnabled ? predictSource.items : [],
        rampActivityItems,
      );

      let filtered = merged;
      if (typeFilter !== undefined) {
        filtered = filtered.filter((item) =>
          activityKindMatchesTypeFilter(item.type, typeFilter),
        );
      }
      if (subFilterKinds) {
        filtered = filtered.filter((item) => subFilterKinds.has(item.type));
      }
      if (networkFilter && networkFilter.length > 0) {
        const allowedChains = new Set(
          networkFilter.map((caipChainId) => caipChainId.toLowerCase()),
        );
        filtered = filtered.filter((item) =>
          allowedChains.has(item.chainId.toLowerCase()),
        );
      }

      return filtered;
    }, [
      unifiedTransactionSource,
      typeFilter,
      subFilterKinds,
      networkFilter,
      isPerpsEnabled,
      perpsSource.items,
      isPredictEnabled,
      predictSource.items,
      rampActivityItems,
    ]);
    const groupedData = useMemo(() => groupActivityListItems(data), [data]);

    const hasConfiguredEvmChains = configuredEVMChainIds.length > 0;
    const popularListBlockExplorer = useBlockExplorer(
      hasConfiguredEvmChains ? configuredEVMChainIds[0] : undefined,
    );

    const configBlockExplorerUrl = useMemo(() => {
      if (
        !configuredEVMChainIds?.length ||
        configuredEVMChainIds.length !== 1
      ) {
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
    const showNonEvmFooter =
      hasConfiguredNonEvmChains && !hasConfiguredEvmChains;

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
      if (!selectedAccountGroupSolanaAddress || !nonEvmExplorerChainId)
        return '';
      return getAddressUrl(
        selectedAccountGroupSolanaAddress,
        nonEvmExplorerChainId as SupportedCaipChainId,
      );
    }, [nonEvmExplorerChainId, selectedAccountGroupSolanaAddress]);

    const showNonEvmExplorerLink =
      showNonEvmFooter &&
      allNonEvmChainsAreSolana &&
      Boolean(nonEvmExplorerUrl);

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

    const perpsRelevantForFilter =
      typeFilter === undefined ||
      typeFilter === ActivityTypeFilter.All ||
      typeFilter === ActivityTypeFilter.Perps;
    const predictRelevantForFilter =
      typeFilter === undefined ||
      typeFilter === ActivityTypeFilter.All ||
      typeFilter === ActivityTypeFilter.Predictions;

    const perpsFilterActive =
      typeFilter === ActivityTypeFilter.Perps ||
      typeFilter === ActivityTypeFilter.All;
    const predictFilterActive =
      typeFilter === ActivityTypeFilter.Predictions ||
      typeFilter === ActivityTypeFilter.All;

    const perpsActivatedRef = useRef(false);
    const predictActivatedRef = useRef(false);
    if (isPerpsEnabled && perpsFilterActive) {
      perpsActivatedRef.current = true;
    }
    if (isPredictEnabled && predictFilterActive) {
      predictActivatedRef.current = true;
    }
    const shouldMountPerpsSource = isPerpsEnabled && perpsActivatedRef.current;
    const shouldMountPredictSource =
      isPredictEnabled && predictActivatedRef.current;

    const isFetchingMoreActivity =
      isFetchingNextPage ||
      (isPerpsEnabled &&
        perpsRelevantForFilter &&
        Boolean(perpsSource.isFetchingMore)) ||
      (isPredictEnabled &&
        predictRelevantForFilter &&
        Boolean(predictSource.isFetchingMore));

    const footerComponent = useMemo(() => {
      if (isFetchingMoreActivity) {
        return (
          <View
            style={tw.style('items-center justify-center py-4')}
            testID={ActivityListSelectorsIDs.LOAD_MORE_INDICATOR}
          >
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
      isFetchingMoreActivity,
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

    const perpsRefetch = perpsSource.refetch;
    const predictRefetch = predictSource.refetch;
    const onRefresh = useCallback(async () => {
      setRefreshing(true);
      try {
        await Promise.all([
          updateIncomingTransactions(),
          refetch(),
          perpsRefetch?.(),
          predictRefetch?.(),
        ]);
      } finally {
        setRefreshing(false);
      }
    }, [refetch, perpsRefetch, predictRefetch]);

    // Guards against out-of-order async decodes: each press claims a token, and
    // only the most recent press is allowed to open the details sheet. Without
    // this, tapping row A then row B before A's decode resolves could navigate to
    // A last and show the wrong transaction.
    const activityPressTokenRef = useRef(0);

    const handleActivityItemPress = useCallback(
      async (item: ActivityListItem) => {
        const { raw } = item;
        if (!raw) return;

        // Non-EVM swaps/bridges submitted from this device carry a
        // bridge-history entry. Cross-chain bridges keep their dedicated
        // bridge-status screen, mirroring hasDedicatedDetailScreen for local
        // EVM bridges; same-chain swaps fall through to the shared detail flows.
        if (raw.type === 'keyringTransaction') {
          const keyringBridgeHistoryItem = getBridgeHistoryItemByHash(
            item.hash,
          );
          if (
            keyringBridgeHistoryItem &&
            isBridgeTxHistoryItemBridge(keyringBridgeHistoryItem)
          ) {
            handleUnifiedSwapsTxHistoryItemClick({
              navigation,
              multiChainTx: raw.data,
              bridgeTxHistoryItem: keyringBridgeHistoryItem,
            });
            return;
          }
        }

        if (isTransactionsRedesignEnabled) {
          const detailsRoute = getActivityDetailsRoute(item);
          if (detailsRoute) {
            navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
            return;
          }
        }

        const pressToken = (activityPressTokenRef.current += 1);

        // Perps rows route to the dedicated perps detail screens, mirroring the
        // legacy perps transactions view (trade → position, funding → funding,
        // order → order). Deposits/withdrawals have no detail screen.
        if (raw.type === 'perpsTransaction') {
          const perpsTx = raw.data;
          if (perpsTx.type === 'trade') {
            navigation.navigate(Routes.PERPS.POSITION_TRANSACTION, {
              transaction: perpsTx,
            });
          } else if (perpsTx.type === 'funding') {
            navigation.navigate(Routes.PERPS.FUNDING_TRANSACTION, {
              transaction: perpsTx,
            });
          } else if (perpsTx.type === 'order') {
            navigation.navigate(Routes.PERPS.ORDER_TRANSACTION, {
              transaction: perpsTx,
            });
          }
          return;
        }

        if (raw.type === 'predictActivity') {
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.ACTIVITY_DETAIL,
            params: { activity: predictActivityToItem(raw.data) },
          });
          return;
        }

        if (raw.type === 'rampOrder') {
          if (!isTransactionsRedesignEnabled) {
            if (raw.data.provider === FIAT_ORDER_PROVIDERS.DEPOSIT) {
              navigation.navigate(Routes.DEPOSIT.ORDER_DETAILS, {
                orderId: raw.data.id,
              });
            } else if (raw.data.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2) {
              navigation.navigate(Routes.RAMP.RAMPS_ORDER_DETAILS, {
                orderId: raw.data.id,
              });
            } else {
              navigation.navigate(Routes.RAMP.ORDER_DETAILS, {
                orderId: raw.data.id,
              });
            }
            return;
          }
          navigation.navigate(Routes.ACTIVITY_DETAILS, {
            chainId: item.chainId,
            txIdentifier: item.hash ?? raw.data.id,
          });
          return;
        }

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
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- Older persisted bridge history can still be keyed by actionId.
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

        const txChainId = tx.chainId;

        // Decode the EVM transaction the same way the legacy list does, so the
        // detail sheet's From/To and Amount/gas/total fields are populated.
        // The unified list is multi-chain, so the per-chain rates/ticker/tokens
        // are read from the store for this tx's chain rather than via hooks.
        try {
          const state = store.getState();
          const [transactionElement, transactionDetails] =
            await decodeTransaction({
              tx,
              selectedAddress: selectedEvmAddress,
              chainId: txChainId,
              txChainId,
              ticker: selectTickerByChainId(state, txChainId),
              conversionRate: selectConversionRateByChainId(state, txChainId),
              currencyRates: selectCurrencyRates(state),
              currentCurrency: selectCurrentCurrency(state),
              contractExchangeRates: selectContractExchangeRatesByChainId(
                state,
                txChainId,
              ),
              primaryCurrency: selectPrimaryCurrency(state),
              swapsTransactions: selectSwapsTransactions(state),
              tokens: selectTokensByChainIdAndWalletAddress(
                state,
                txChainId,
                selectedEvmAddress,
              ),
              selectedInternalAccount: selectSelectedInternalAccount(state),
            });

          if (activityPressTokenRef.current !== pressToken) return;

          navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.TRANSACTION_DETAILS,
            params: {
              tx,
              transactionElement,
              transactionDetails,
              showSpeedUpModal: noop,
              showCancelModal: noop,
            },
          });
        } catch {
          if (activityPressTokenRef.current !== pressToken) return;
          const { from, to } = getActivityFromTo(item);
          const value = getActivityValue(item);
          navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.TRANSACTION_DETAILS,
            params: {
              tx,
              transactionElement: { actionKey, value },
              transactionDetails: {
                hash: item.hash,
                renderFrom: from,
                renderTo: to,
                renderValue: value,
                transactionType: item.type,
                txChainId,
              },
              showSpeedUpModal: noop,
              showCancelModal: noop,
            },
          });
        }
      },
      [
        bridgeHistory,
        getBridgeHistoryItemByHash,
        isTransactionsRedesignEnabled,
        navigation,
        selectedAccountGroupEvmAddress,
        selectedInternalAccount?.address,
      ],
    );

    // Index of the last API-confirmed EVM item — used to trigger pagination.
    const lastConfirmedEvmIndex = useMemo(() => {
      for (let index = groupedData.length - 1; index >= 0; index -= 1) {
        const item = groupedData[index];
        if (
          item.type === 'item' &&
          item.item.raw?.type === 'apiEvmTransaction'
        ) {
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
        const maxVisibleIndex = viewableItems.reduce(
          (max, { index }) =>
            typeof index === 'number' && index > max ? index : max,
          -1,
        );
        if (maxVisibleIndex < 0) return;

        // EVM (API) pagination — prefetch when nearing the last confirmed EVM row.
        if (
          hasNextPage &&
          !isFetchingNextPage &&
          lastConfirmedEvmKey &&
          lastConfirmedEvmIndex >= 0 &&
          maxVisibleIndex >=
            Math.max(lastConfirmedEvmIndex - confirmedEvmOverscan, 0)
        ) {
          fetchNextPage();
        }

        // Domain sources interleave with EVM by time, so the trigger is nearing
        // the bottom of the whole list. Each source guards its own in-flight
        // state, so a redundant call here is a no-op.
        const isNearListBottom =
          maxVisibleIndex >=
          Math.max(groupedData.length - 1 - confirmedEvmOverscan, 0);
        if (!isNearListBottom) return;

        if (
          isPerpsEnabled &&
          perpsRelevantForFilter &&
          perpsSource.hasMore &&
          !perpsSource.isFetchingMore
        ) {
          perpsSource.loadMore?.();
        }
        if (
          isPredictEnabled &&
          predictRelevantForFilter &&
          predictSource.hasMore &&
          !predictSource.isFetchingMore
        ) {
          predictSource.loadMore?.();
        }
      },
      [
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        lastConfirmedEvmIndex,
        lastConfirmedEvmKey,
        groupedData.length,
        isPerpsEnabled,
        perpsRelevantForFilter,
        perpsSource,
        isPredictEnabled,
        predictRelevantForFilter,
        predictSource,
      ],
    );

    const listRef = useRef<FlashListRef<GroupedActivityListItem>>(null);

    const isDomainFilter =
      typeFilter === ActivityTypeFilter.Perps ||
      typeFilter === ActivityTypeFilter.Predictions;

    const { handleScroll } = useTransactionAutoScroll(data, listRef, {
      enabled: !isDomainFilter,
      keyExtractor: (item) =>
        item.hash ?? `${item.chainId}-${item.timestamp}-${item.type}`,
    });

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: () =>
          listRef.current?.scrollToOffset({ offset: 0, animated: true }),
      }),
      [],
    );

    // Reset to the top whenever the filter changes — the list contents are
    // different, so keeping the prior scroll depth is disorienting. (Don't rely
    // on useTransactionAutoScroll's "new item" heuristic, which fires
    // inconsistently across filter switches.)
    const isInitialFilterRender = useRef(true);
    useEffect(() => {
      if (isInitialFilterRender.current) {
        isInitialFilterRender.current = false;
        return;
      }
      listRef.current?.scrollToOffset({ offset: 0, animated: false });

      if (scrollY) {
        scrollY.value = 0;
      }
    }, [typeFilter, networkFilter, subFilterKinds, scrollY]);

    const runAutoScroll = useCallback(() => {
      handleScroll();
    }, [handleScroll]);

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        if (scrollY) {
          scrollY.value = event.contentOffset.y;
        }
        runOnJS(runAutoScroll)();
      },
    });

    const perpsSubFilterActive =
      typeFilter === ActivityTypeFilter.Perps &&
      Boolean(subFilterKinds) &&
      isPerpsEnabled &&
      perpsSource.items.length > 0;

    const renderEmptyList = () => (
      <View style={styles.emptyList}>
        <ActivityEmptyState
          typeFilter={typeFilter ?? ActivityTypeFilter.All}
          perpsSubFilterActive={perpsSubFilterActive}
        />
      </View>
    );

    const renderInitialLoading = () => (
      <View style={styles.emptyList}>
        <ActivityIndicator
          color={colors.icon.default}
          testID={ActivityListSelectorsIDs.LOADING_INDICATOR}
        />
      </View>
    );

    const isPerpsLoading = isPerpsEnabled && perpsSource.isLoading;
    const isPredictLoading = isPredictEnabled && predictSource.isLoading;
    const isRelevantActivityLoading = (() => {
      switch (typeFilter) {
        case ActivityTypeFilter.Perps:
          return isPerpsLoading;
        case ActivityTypeFilter.Predictions:
          return isPredictLoading;
        // No filter / "All" depends on every source; the remaining filters
        // (Transactions, Buy/Sell, Money, …) are EVM-backed.
        case undefined:
        case ActivityTypeFilter.All:
          return isInitialLoading || isPerpsLoading || isPredictLoading;
        default:
          return isInitialLoading;
      }
    })();

    const shouldShowTransactionList = data.length > 0;
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
          <ActivityListDateHeader label={strings('transaction.pending')} />
        );
      }

      if (groupedItem.type === 'date-header') {
        return <ActivityListDateHeader timestamp={groupedItem.date} />;
      }

      const { item } = groupedItem;

      // All items (API EVM confirmed, completed local EVM, non-EVM) render from
      // the shared ActivityListItem shape.
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
              <AnimatedFlashList
                key={`${typeFilter ?? 'all'}|${
                  networkFilter?.join(',') ?? 'all'
                }`}
                ref={listRef}
                data={items}
                testID={ActivityListSelectorsIDs.CONTAINER}
                renderItem={renderItem}
                keyExtractor={generateGroupedKey}
                ListHeaderComponent={header}
                ListEmptyComponent={
                  isRelevantActivityLoading
                    ? renderInitialLoading
                    : renderEmptyList
                }
                ListFooterComponent={footerComponent}
                maintainVisibleContentPosition={{
                  autoscrollToTopThreshold: 100,
                }}
                style={baseStyles.flexGrow}
                contentContainerStyle={tw.style('pb-8')}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary.default]}
                    tintColor={colors.icon.default}
                  />
                }
                onScroll={scrollHandler}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={visibilityConfig}
                scrollEventThrottle={16}
                scrollEnabled={!isChartBeingTouched}
              />
            )}
          </PriceChartContext.Consumer>
          {shouldMountPerpsSource ? (
            <PerpsActivitySource onChange={setPerpsSource} />
          ) : null}
          {shouldMountPredictSource ? (
            <PredictActivitySource onChange={setPredictSource} />
          ) : null}
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
  },
);

ActivityList.displayName = 'ActivityList';

export default ActivityList;
