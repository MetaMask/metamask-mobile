import React from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import PerpsMarketTileCard from '../../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsFeedItem } from './usePerpsFeed';

interface PerpsTileRowItemProps {
  item: PerpsFeedItem;
  testIdPrefix: string;
  /** Called synchronously before the default press handler fires. */
  onBeforePress?: () => void;
}

const PerpsTileRowItem: React.FC<PerpsTileRowItemProps> = ({
  item,
  testIdPrefix,
  onBeforePress,
}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { market, sparkline, isWatchlisted } = item;

  return (
    <PerpsMarketTileCard
      market={market}
      sparklineData={sparkline}
      showFavoriteTag={isWatchlisted}
      testID={`${testIdPrefix}-${market.symbol}`}
      onPress={() => {
        onBeforePress?.();
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: { market, source: PERPS_EVENT_VALUE.SOURCE.EXPLORE },
        });
      }}
    />
  );
};

export default PerpsTileRowItem;
