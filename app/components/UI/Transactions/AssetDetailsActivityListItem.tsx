import React, { useCallback, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  ActivityListItemRow,
  resolveActivityListItemTitle,
} from '../ActivityListItemRow/ActivityListItemRow';
import { type ActivityListItem } from '../../../util/activity-adapters';
import { findBridgeHistoryItem } from '../../../util/bridge/findBridgeHistoryItem';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details routing; route-isolation backlog
import { getActivityDetailsRoute } from '../../Views/ActivityList/getActivityDetailsRoute';
import ActivityListAccountImportTimeRow from '../ActivityListItemRow/ActivityListAccountImportTimeRow';
import {
  getActivityFromTo,
  getActivityValue,
  getTransactionDetailsParams,
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from './AssetDetailsActivityListItem.utils';

type AssetTokensByChainAndAccount = Record<
  string,
  Record<string, { address: string; symbol?: string; decimals?: number }[]>
>;
type AssetBridgeHistory = Parameters<
  typeof findBridgeHistoryItem
>[0]['bridgeHistory'];

const EMPTY_NETWORK_CONFIGURATIONS: Record<
  string,
  { nativeCurrency?: string }
> = {};
const EMPTY_ASSET_TOKENS: AssetTokensByChainAndAccount = {};
const EMPTY_BRIDGE_HISTORY: AssetBridgeHistory = {};

interface AssetDetailsActivityListItemProps {
  transaction: TransactionWithImportTime;
  index: number;
  assetSymbol?: string;
  chainId?: Hex;
  tokenChainId?: Hex;
  navigation: AppNavigationProp;
  onSpeedUpAction: (open: boolean, tx?: TransactionMeta) => void;
  onCancelAction: (open: boolean, tx?: TransactionMeta) => void;
  accountImportTime?: number;
  groupEvmAccountAddress?: string;
  networkConfigurations?: Record<string, { nativeCurrency?: string }>;
  allTokens?: AssetTokensByChainAndAccount;
  bridgeHistory?: AssetBridgeHistory;
}

export const AssetDetailsActivityListItem = ({
  transaction: tx,
  index,
  assetSymbol,
  chainId: currentChainId,
  tokenChainId,
  navigation,
  onSpeedUpAction,
  onCancelAction,
  accountImportTime,
  groupEvmAccountAddress,
  networkConfigurations = EMPTY_NETWORK_CONFIGURATIONS,
  allTokens = EMPTY_ASSET_TOKENS,
  bridgeHistory = EMPTY_BRIDGE_HISTORY,
}: AssetDetailsActivityListItemProps) => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Older persisted bridge history can still be keyed by actionId.
  const { actionId } = tx;
  const bridgeHistoryItem = useMemo(
    () =>
      findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId: tx.id,
        transactionActionId: actionId,
        transactionHash: tx.hash,
      }),
    [bridgeHistory, tx.id, actionId, tx.hash],
  );

  const activityItem = useMemo(() => {
    const resolvedChainId = (tx.chainId ?? tokenChainId ?? currentChainId) as
      | Hex
      | undefined;

    const nativeAssetSymbol = resolvedChainId
      ? networkConfigurations?.[resolvedChainId]?.nativeCurrency
      : undefined;

    // Token metadata for the tx's target contract, from TokensController —
    // same enrichment as useLocalActivityItems.
    const accountAddress = groupEvmAccountAddress?.toLowerCase();
    const contractAddress = tx.txParams?.to?.toLowerCase();
    const matchingToken =
      resolvedChainId && accountAddress && contractAddress
        ? (allTokens[resolvedChainId]?.[accountAddress] ?? []).find(
            (t) => t.address?.toLowerCase() === contractAddress,
          )
        : undefined;

    return mapTransactionToActivityItem({
      transaction: tx,
      assetSymbol: matchingToken?.symbol ?? assetSymbol,
      assetDecimals: matchingToken?.decimals,
      assetAddress: matchingToken ? contractAddress : undefined,
      nativeAssetSymbol,
      currentChainId,
      tokenChainId,
      bridgeHistoryItem,
    });
  }, [
    allTokens,
    assetSymbol,
    bridgeHistoryItem,
    currentChainId,
    groupEvmAccountAddress,
    networkConfigurations,
    tokenChainId,
    tx,
  ]);

  const handlePress = useCallback(
    (item: ActivityListItem) => {
      const detailsRoute = getActivityDetailsRoute(item);
      if (detailsRoute) {
        navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
        return;
      }

      const { from, to } = getActivityFromTo(item);
      const value = getActivityValue(item);
      const actionKey = resolveActivityListItemTitle(item, bridgeHistoryItem);

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TRANSACTION_DETAILS,
        params: getTransactionDetailsParams({
          item,
          selectedTx: tx,
          actionKey,
          value,
          from,
          to,
          currentChainId,
          tokenChainId,
          showSpeedUpModal: () => onSpeedUpAction(true, tx),
          showCancelModal: () => onCancelAction(true, tx),
        }),
      });
    },
    [
      bridgeHistoryItem,
      currentChainId,
      navigation,
      onCancelAction,
      onSpeedUpAction,
      tokenChainId,
      tx,
    ],
  );

  const handleImportTimePress = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.IMPORT_WALLET_TIP,
    });
  }, [navigation]);

  const shouldRenderImportTime =
    Boolean(tx.insertImportTime) &&
    typeof accountImportTime === 'number' &&
    Number.isFinite(accountImportTime);
  const importTimeRow = shouldRenderImportTime ? (
    <ActivityListAccountImportTimeRow
      importTime={accountImportTime}
      onPress={handleImportTimePress}
    />
  ) : null;

  const shouldShowImportTimeBeforeRow =
    shouldRenderImportTime && accountImportTime > activityItem.timestamp;

  return (
    <Box twClassName="px-4">
      {shouldShowImportTimeBeforeRow && importTimeRow}
      <ActivityListItemRow
        bridgeHistoryItem={bridgeHistoryItem}
        item={activityItem}
        index={index}
        onPress={handlePress}
      />
      {!shouldShowImportTimeBeforeRow && importTimeRow}
    </Box>
  );
};

export default AssetDetailsActivityListItem;
