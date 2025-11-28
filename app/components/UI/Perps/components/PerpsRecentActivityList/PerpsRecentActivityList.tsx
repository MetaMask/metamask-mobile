import React, { useCallback } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsNavigationParamList } from '../../controllers/types';
import type { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsRecentActivityList.styles';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';

interface PerpsRecentActivityListProps {
  transactions: PerpsTransaction[];
  isLoading?: boolean;
  iconSize?: number;
}

const PerpsRecentActivityList: React.FC<PerpsRecentActivityListProps> = ({
  transactions,
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

  // Render right content for trades (only type shown)
  const renderRightContent = useCallback((transaction: PerpsTransaction) => {
    if (!transaction.fill) return null;

    const pnlColor = transaction.fill.isPositive
      ? TextColor.Success
      : TextColor.Error;
    return (
      <Text variant={TextVariant.BodyMDMedium} color={pnlColor}>
        {transaction.fill.amount}
      </Text>
    );
  }, []);

  const renderItem = useCallback(
    (props: { item: PerpsTransaction; index: number }) => {
      const { item, index } = props;
      const isFirstItem = index === 0;
      const isLastItem = index === transactions.length - 1;

      return (
        <TouchableOpacity
          style={[
            styles.activityItem,
            isFirstItem && styles.activityItemFirst,
            isLastItem && styles.activityItemLast,
          ]}
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
                  {getPerpsDisplaySymbol(item.subtitle)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rightSection}>{renderRightContent(item)}</View>
        </TouchableOpacity>
      );
    },
    [
      styles,
      handleTransactionPress,
      iconSize,
      renderRightContent,
      transactions.length,
    ],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('perps.home.recent_activity')}
          </Text>
        </View>
        <PerpsRowSkeleton count={3} />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
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
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('perps.home.recent_activity')}
        </Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.home.see_all')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          scrollEnabled={false}
        />
      </View>
    </View>
  );
};

export default PerpsRecentActivityList;
