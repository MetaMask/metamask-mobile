import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { selectErc20MetadataLookup } from '../../../selectors/assets/assets-controller';
import { ActivityListItemRow } from '../ActivityListItemRow/ActivityListItemRow';
import { type ActivityListItem } from '../../../util/activity-adapters';
import { findBridgeHistoryItem } from '../../../util/bridge/findBridgeHistoryItem';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details routing; route-isolation backlog
import { getActivityDetailsRoute } from '../../Views/ActivityList/getActivityDetailsRoute';
import ActivityListAccountImportTimeRow from '../ActivityListItemRow/ActivityListAccountImportTimeRow';
import {
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from './AssetDetailsActivityListItem.utils';

type AssetBridgeHistory = Parameters<
  typeof findBridgeHistoryItem
>[0]['bridgeHistory'];

const EMPTY_NETWORK_CONFIGURATIONS: Record<
  string,
  { nativeCurrency?: string }
> = {};
const EMPTY_BRIDGE_HISTORY: AssetBridgeHistory = {};

interface AssetDetailsActivityListItemProps {
  transaction: TransactionWithImportTime;
  index: number;
  assetSymbol?: string;
  chainId?: Hex;
  tokenChainId?: Hex;
  navigation: AppNavigationProp;
  accountImportTime?: number;
  networkConfigurations?: Record<string, { nativeCurrency?: string }>;
  bridgeHistory?: AssetBridgeHistory;
}

export const AssetDetailsActivityListItem = ({
  transaction: tx,
  index,
  assetSymbol,
  chainId: currentChainId,
  tokenChainId,
  navigation,
  accountImportTime,
  networkConfigurations = EMPTY_NETWORK_CONFIGURATIONS,
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

  const getErc20Metadata = useSelector(selectErc20MetadataLookup);

  const activityItem = useMemo(() => {
    const resolvedChainId = (tx.chainId ?? tokenChainId ?? currentChainId) as
      | Hex
      | undefined;

    const nativeAssetSymbol = resolvedChainId
      ? networkConfigurations?.[resolvedChainId]?.nativeCurrency
      : undefined;

    // Token metadata for the tx's target contract, from AssetsController —
    // same enrichment as selectLocalActivityItems.
    const contractAddress = tx.txParams?.to?.toLowerCase();
    const matchingToken =
      resolvedChainId && contractAddress
        ? getErc20Metadata(resolvedChainId, contractAddress)
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
    assetSymbol,
    bridgeHistoryItem,
    currentChainId,
    getErc20Metadata,
    networkConfigurations,
    tokenChainId,
    tx,
  ]);

  const handlePress = useCallback(
    (item: ActivityListItem) => {
      const detailsRoute = getActivityDetailsRoute(item);
      if (detailsRoute) {
        navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
      }
    },
    [navigation],
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
