import React, { useCallback } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
} from '../../controllers/types';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsWatchlistMarkets.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';

interface PerpsWatchlistMarketsProps {
  markets: PerpsMarketData[];
  isLoading?: boolean;
}

const PerpsWatchlistMarkets: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  isLoading,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
    [navigation],
  );

  const renderMarket = useCallback(
    ({ item }: { item: PerpsMarketData }) => (
      <PerpsMarketRowItem
        market={item}
        onPress={() => handleMarketPress(item)}
      />
    ),
    [handleMarketPress],
  );

  // Header component
  const SectionHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          {strings('perps.home.watchlist')}
        </Text>
      </View>
    ),
    [styles.header],
  );

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader />
        <View style={styles.contentContainer}>
          <PerpsRowSkeleton count={3} />
        </View>
      </View>
    );
  }

  // Hide section entirely when no markets
  if (markets.length === 0) {
    return null;
  }

  // Render market list
  return (
    <View style={styles.section}>
      <SectionHeader />
      <View style={styles.contentContainer}>
        <FlatList
          data={markets}
          renderItem={renderMarket}
          keyExtractor={(item) => item.symbol}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
};

export default PerpsWatchlistMarkets;
