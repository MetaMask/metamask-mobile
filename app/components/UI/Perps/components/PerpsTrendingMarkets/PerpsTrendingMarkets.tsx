import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
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
import { useStyles } from '../../../../../component-library/hooks';
import type { SortField } from '../../utils/sortMarkets';
import PerpsMarketList from '../PerpsMarketList';
import styleSheet from './PerpsTrendingMarkets.styles';

interface PerpsTrendingMarketsProps {
  markets: PerpsMarketData[];
  sortBy?: SortField;
  isLoading?: boolean;
}

const PerpsTrendingMarkets: React.FC<PerpsTrendingMarketsProps> = ({
  markets,
  sortBy = 'volume',
  isLoading,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.TRENDING,
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

  // Header component for the trending section
  const TrendingHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          {strings('perps.home.trending')}
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.home.see_all')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [styles.header, handleViewAll],
  );

  if (isLoading || markets.length === 0) {
    return (
      <View style={styles.container}>
        <TrendingHeader />
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.emptyText}
        >
          {isLoading
            ? strings('perps.home.loading')
            : strings('perps.home.no_markets')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PerpsMarketList
        markets={markets}
        sortBy={sortBy}
        onMarketPress={handleMarketPress}
        ListHeaderComponent={TrendingHeader}
      />
    </View>
  );
};

export default PerpsTrendingMarkets;
