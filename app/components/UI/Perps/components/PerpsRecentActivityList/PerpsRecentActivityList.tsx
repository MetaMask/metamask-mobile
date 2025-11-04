import React, { useCallback } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  OrderFill,
  PerpsNavigationParamList,
} from '../../controllers/types';
import type { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsRecentActivityList.styles';
import { transformFillsToTransactions } from '../../utils/transactionTransforms';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import PerpsRowSkeleton from '../PerpsRowSkeleton';

interface PerpsRecentActivityListProps {
  fills: OrderFill[];
  isLoading?: boolean;
  iconSize?: number;
}

const PerpsRecentActivityList: React.FC<PerpsRecentActivityListProps> = ({
  fills,
  isLoading,
  iconSize = HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const handleSeeAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ACTIVITY, {
      redirectToPerpsTransactions: true,
      showBackButton: true,
    });
  }, [navigation]);

  const handleTransactionPress = useCallback(
    (transaction: PerpsTransaction) => {
      // Navigate to appropriate transaction detail view
      if (transaction.fill) {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: { symbol: transaction.asset, name: transaction.asset },
          },
        });
      }
    },
    [navigation],
  );

  // Transform fills to transactions for display
  const transactions = transformFillsToTransactions(fills);

  const renderItem = useCallback(
    ({
      item,
    }: {
      item: ReturnType<typeof transformFillsToTransactions>[0];
    }) => {
      const isPositive = item.fill?.isPositive ?? false;
      const pnlColor = isPositive ? TextColor.Success : TextColor.Error;

      return (
        <TouchableOpacity
          style={styles.activityItem}
          onPress={() => handleTransactionPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <PerpsTokenLogo
                symbol={item.asset}
                size={iconSize}
                recyclingKey={`${item.asset}-${item.id}`}
              />
            </View>
            <View style={styles.activityInfo}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
                style={styles.activityType}
              >
                {item.title}
              </Text>
              {!!item.subtitle && (
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.activityAmount}
                >
                  {item.subtitle}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rightSection}>
            {item.fill && (
              <Text variant={TextVariant.BodyMDMedium} color={pnlColor}>
                {item.fill.amount}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [styles, handleTransactionPress, iconSize],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.home.recent_activity')}
          </Text>
        </View>
        <PerpsRowSkeleton count={3} />
      </View>
    );
  }

  if (fills.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.home.recent_activity')}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.emptyText}
        >
          {strings('perps.home.no_activity')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          {strings('perps.home.recent_activity')}
        </Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.home.see_all')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id || index}`}
        scrollEnabled={false}
      />
    </View>
  );
};

export default PerpsRecentActivityList;
