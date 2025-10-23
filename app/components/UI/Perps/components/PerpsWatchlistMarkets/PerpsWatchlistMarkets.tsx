import React, { useCallback } from 'react';
import { FlatList, View, TouchableOpacity } from 'react-native';
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

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKETS,
      params: {
        showWatchlistOnly: true,
      },
    });
  }, [navigation]);

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

  if (isLoading || markets.length === 0) {
    return null; // Don't show section if no watchlist markets
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          {strings('perps.home.watchlist')}
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
            {strings('perps.home.see_all')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={markets}
        renderItem={renderMarket}
        keyExtractor={(item) => item.symbol}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default PerpsWatchlistMarkets;
