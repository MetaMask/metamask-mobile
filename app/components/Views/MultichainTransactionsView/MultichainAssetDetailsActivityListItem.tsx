import React, { useCallback, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import type { Transaction } from '@metamask/keyring-api';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { TransactionDetailLocation } from '../../../core/Analytics/events/transactions';
import { selectIsTransactionsRedesignEnabled } from '../../../selectors/featureFlagController/activityRedesign';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import { ActivityListItemRow } from '../../UI/ActivityListItemRow/ActivityListItemRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details routing; route-isolation backlog
import { getActivityDetailsRoute } from '../ActivityList/getActivityDetailsRoute';
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
  const isTransactionsRedesignEnabled = useSelector(
    selectIsTransactionsRedesignEnabled,
  );
  const displayData = useMultichainTransactionDisplay(transaction, chainId);
  const activityItem = useMemo(
    () => mapMultichainTransactionToActivityItem({ transaction, chainId }),
    [transaction, chainId],
  );

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

    if (isTransactionsRedesignEnabled) {
      const detailsRoute = getActivityDetailsRoute(activityItem);
      if (detailsRoute) {
        navigation.navigate(Routes.ACTIVITY_DETAILS, detailsRoute);
        return;
      }
    }

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
      params: { displayData, transaction },
    });
  }, [
    activityItem,
    chainId,
    createEventBuilder,
    displayData,
    isTransactionsRedesignEnabled,
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
