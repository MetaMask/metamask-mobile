import React, { useCallback, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  ActivityListItemRow,
  resolveActivityListItemTitle,
} from '../ActivityListItemRow/ActivityListItemRow';
import { type ActivityListItem } from '../../../util/activity-adapters';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import {
  useBridgeHistoryItemBySrcTxHash,
  findBridgeHistoryItemBySrcTxHash,
} from '../Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import { selectIsTransactionsRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';
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
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';

interface AssetDetailsActivityListItemProps {
  transaction: TransactionWithImportTime;
  index: number;
  assetSymbol?: string;
  chainId?: Hex;
  tokenChainId?: Hex;
  navigation: AppNavigationProp;
  onSpeedUpAction: (open: boolean, tx?: TransactionMeta) => void;
  onCancelAction: (open: boolean, tx?: TransactionMeta) => void;
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
}: AssetDetailsActivityListItemProps) => {
  // Kept for importTime metadata
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  // Used for TokensController lookups (matches useLocalActivityItems)
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const isTransactionsRedesignEnabled = useSelector(
    selectIsTransactionsRedesignEnabled,
  );

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  // allTokens: Record<chainId, Record<accountAddress, Token[]>>
  const allTokens = useSelector(selectAllTokens) as unknown as Record<
    string,
    Record<string, { address: string; symbol?: string; decimals?: number }[]>
  >;
  const accountImportTime = selectedInternalAccount?.metadata.importTime;
  const activityItem = useMemo(() => {
    const resolvedChainId = (tx.chainId ?? tokenChainId ?? currentChainId) as
      | Hex
      | undefined;

    const nativeAssetSymbol = resolvedChainId
      ? networkConfigurations?.[resolvedChainId]?.nativeCurrency
      : undefined;

    // Token metadata for the tx's target contract, from TokensController —
    // same enrichment as useLocalActivityItems.
    const accountAddress = groupEvmAccount?.address?.toLowerCase();
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
    });
  }, [
    allTokens,
    assetSymbol,
    currentChainId,
    groupEvmAccount?.address,
    networkConfigurations,
    tokenChainId,
    tx,
  ]);

  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();
  const bridgeHistoryItem = findBridgeHistoryItemBySrcTxHash(
    bridgeHistoryItemsBySrcTxHash,
    activityItem.hash,
  );

  const handlePress = useCallback(
    (item: ActivityListItem) => {
      if (isTransactionsRedesignEnabled) {
        const detailsRoute = getActivityDetailsRoute(item);
        if (detailsRoute) {
          navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
          return;
        }
      }

      const selectedTx =
        item.raw?.type === 'localTransaction'
          ? item.raw.data.primaryTransaction
          : undefined;
      if (!selectedTx) return;

      const { from, to } = getActivityFromTo(item);
      const value = getActivityValue(item);
      const actionKey = resolveActivityListItemTitle(item, bridgeHistoryItem);

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TRANSACTION_DETAILS,
        params: getTransactionDetailsParams({
          item,
          selectedTx,
          actionKey,
          value,
          from,
          to,
          currentChainId,
          tokenChainId,
          showSpeedUpModal: () => onSpeedUpAction(true, selectedTx),
          showCancelModal: () => onCancelAction(true, selectedTx),
        }),
      });
    },
    [
      bridgeHistoryItem,
      currentChainId,
      isTransactionsRedesignEnabled,
      navigation,
      onCancelAction,
      onSpeedUpAction,
      tokenChainId,
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
