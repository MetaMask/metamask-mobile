import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { Transaction } from '@metamask/keyring-api';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import { ActivityListItemRow } from '../../UI/ActivityListItemRow/ActivityListItemRow';
import {
  getMultichainTransactionDetailEventProperties,
  mapMultichainTransactionToActivityItem,
  TRANSACTION_DETAIL_EVENTS,
} from './MultichainAssetDetailsActivityListItem.utils';

interface MultichainAssetDetailsActivityListItemProps {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
  navigation: AppNavigationProp;
  index: number;
  location?: TransactionDetailLocation;
}

export const MultichainAssetDetailsActivityListItem = ({
  transaction,
  chainId,
  navigation,
  index,
  location,
}: MultichainAssetDetailsActivityListItemProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const displayData = useMultichainTransactionDisplay(transaction, chainId);
  const activityItem = mapMultichainTransactionToActivityItem({
    transaction,
    chainId,
  });

  const handlePress = useCallback(() => {
    trackEvent(
      createEventBuilder(TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED)
        .addProperties(
          getMultichainTransactionDetailEventProperties({
            transaction,
            chainId,
            location,
          }),
        )
        .build(),
    );

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
      params: { displayData, transaction },
    });
  }, [
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
        item={activityItem}
        index={index}
        onPress={handlePress}
        title={displayData.title}
      />
    </Box>
  );
};

export default MultichainAssetDetailsActivityListItem;
