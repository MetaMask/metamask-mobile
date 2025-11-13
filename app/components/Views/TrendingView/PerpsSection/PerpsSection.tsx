import React, { useCallback } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import SectionCard from '../components/SectionCard/SectionCard';
import PerpsMarketRowSkeleton from '../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketRowSkeleton';
import { FlashList } from '@shopify/flash-list';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';
import PerpsMarketRowItem from '../../../UI/Perps/components/PerpsMarketRowItem';
import { PerpsMarketData } from '../../../UI/Perps/controllers/types';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

const PerpsSection = () => {
  const navigation = useNavigation();
  const { markets, isLoading } = usePerpsMarkets();
  const perpsTokens = markets.slice(0, 3);

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'all',
      },
    });
  }, [navigation]);

  const handleTokenPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
    [navigation],
  );

  return (
    <View>
      <SectionHeader
        title={strings('trending.perps')}
        onViewAll={handleViewAll}
      />
      <SectionCard>
        {isLoading || perpsTokens.length === 0 ? (
          <>
            <PerpsMarketRowSkeleton />
            <PerpsMarketRowSkeleton />
            <PerpsMarketRowSkeleton />
          </>
        ) : (
          <FlashList
            data={perpsTokens}
            renderItem={({ item }) => (
              <PerpsMarketRowItem
                market={item}
                onPress={() => handleTokenPress(item)}
              />
            )}
            keyExtractor={(item) => item.symbol}
            keyboardShouldPersistTaps="handled"
            testID="perps-tokens-list"
          />
        )}
      </SectionCard>
    </View>
  );
};

export default PerpsSection;
