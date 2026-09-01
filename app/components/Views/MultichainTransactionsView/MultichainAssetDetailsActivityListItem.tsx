import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import { ActivityListItemRow } from '../../UI/ActivityListItemRow/ActivityListItemRow';
import {
  handleUnifiedSwapsTxHistoryItemClick,
  isBridgeTxHistoryItemBridge,
} from '../../UI/Bridge/utils/transaction-history';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details routing; route-isolation backlog
import { getActivityDetailsRoute } from '../ActivityList/getActivityDetailsRoute';
import { type ActivityListItem } from '../../../util/activity-adapters';
import {
  getMultichainTransactionDetailEventProperties,
  ACTIVITY_DETAIL_EVENTS,
} from './MultichainAssetDetailsActivityListItem.utils';

interface MultichainAssetDetailsActivityListItemProps {
  item: ActivityListItem;
  transaction?: Transaction;
  chainId: SupportedCaipChainId;
  bridgeHistoryItem?: BridgeHistoryItem;
  contextAssetId?: string;
  navigation: AppNavigationProp;
  index: number;
  location?: TransactionDetailLocation;
}

export const MultichainAssetDetailsActivityListItem = ({
  item,
  transaction,
  chainId,
  bridgeHistoryItem,
  contextAssetId,
  navigation,
  index,
  location,
}: MultichainAssetDetailsActivityListItemProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const displayData = useMultichainTransactionDisplay(transaction, chainId);

  const handlePress = useCallback(() => {
    if (transaction) {
      trackEvent(
        createEventBuilder(ACTIVITY_DETAIL_EVENTS.OPENED)
          .addProperties(
            getMultichainTransactionDetailEventProperties({
              transaction,
              chainId,
              location,
              bridgeHistoryItem,
            }),
          )
          .build(),
      );
    }

    const detailsRoute = getActivityDetailsRoute(item, {
      contextAssetId,
    });
    if (detailsRoute) {
      navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
      return;
    }

    if (bridgeHistoryItem && isBridgeTxHistoryItemBridge(bridgeHistoryItem)) {
      handleUnifiedSwapsTxHistoryItemClick({
        navigation,
        multiChainTx: transaction,
        bridgeTxHistoryItem: bridgeHistoryItem,
      });
      return;
    }

    if (!transaction) {
      return;
    }

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
      params: { displayData, transaction },
    });
  }, [
    contextAssetId,
    item,
    bridgeHistoryItem,
    chainId,
    createEventBuilder,
    displayData,
    location,
    navigation,
    trackEvent,
    transaction,
  ]);

  return (
    <Box twClassName="px-4">
      <ActivityListItemRow
        bridgeHistoryItem={bridgeHistoryItem}
        contextAssetId={contextAssetId}
        item={item}
        index={index}
        onPress={handlePress}
      />
    </Box>
  );
};

export default MultichainAssetDetailsActivityListItem;
