import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  ListItem,
  SectionHeader,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  getPerpsDisplaySymbol,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import type { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import PerpsFillTag from '../PerpsFillTag';
import {
  HOME_SCREEN_CONFIG,
  PERPS_BALANCE_CHAIN_ID,
} from '../../constants/perpsConfig';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MonetizedPrimitive } from '../../../../../core/Analytics/MetaMetrics.types';
import {
  TRANSACTION_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../../../core/Analytics/events/transactions';

interface PerpsRecentActivityListProps {
  transactions: PerpsTransaction[];
  isLoading?: boolean;
  iconSize?: number;
}

const PerpsRecentActivityList: React.FC<PerpsRecentActivityListProps> = ({
  transactions,
  isLoading,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activityTitle = strings('perps.home.recent_activity');

  const handleSeeAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ACTIVITY, {
      redirectToPerpsTransactions: true,
      showBackButton: true,
    });
  }, [navigation]);

  const handleTransactionPress = useCallback(
    (transaction: PerpsTransaction) => {
      if (transaction.fill) {
        trackEvent(
          createEventBuilder(TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED)
            .addProperties({
              transaction_type: `perps_${transaction.type}`,
              transaction_status: 'confirmed',
              location: TransactionDetailLocation.Home,
              chain_id_source: PERPS_BALANCE_CHAIN_ID,
              chain_id_destination: PERPS_BALANCE_CHAIN_ID,
              monetized_primitive: MonetizedPrimitive.Perps,
            })
            .build(),
        );

        navigation.navigate(Routes.PERPS.POSITION_TRANSACTION, {
          transaction,
        });
      }
    },
    [navigation, trackEvent, createEventBuilder],
  );

  const renderItem = useCallback(
    (props: { item: PerpsTransaction }) => {
      const { item } = props;
      const fill = item.fill;

      return (
        <ListItem
          isInteractive
          avatar={
            <PerpsTokenLogo
              symbol={item.asset}
              size={iconSize}
              recyclingKey={`${item.asset}-${item.id}`}
            />
          }
          title={item.title}
          titleEndAccessory={
            <PerpsFillTag
              transaction={item}
              screenName={PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_HOME}
            />
          }
          description={
            item.subtitle ? getPerpsDisplaySymbol(item.subtitle) : undefined
          }
          value={fill?.amount}
          valueProps={{
            color: fill?.isPositive
              ? TextColor.SuccessDefault
              : TextColor.ErrorDefault,
          }}
          onPress={() => handleTransactionPress(item)}
        />
      );
    },
    [handleTransactionPress, iconSize],
  );

  if (isLoading) {
    return (
      <Box>
        <SectionHeader title={activityTitle} />
        <PerpsRowSkeleton count={3} />
      </Box>
    );
  }

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Box>
      <SectionHeader
        title={activityTitle}
        isInteractive
        onPress={handleSeeAll}
      />
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id || index}`}
        scrollEnabled={false}
      />
    </Box>
  );
};

export default PerpsRecentActivityList;
