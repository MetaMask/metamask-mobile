import React from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import PerpsMarketTileCard from '../../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsFeedItem } from './usePerpsFeed';

interface PerpsTileRowItemProps {
  item: PerpsFeedItem;
  testIdPrefix: string;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
}

const PerpsTileRowItem: React.FC<PerpsTileRowItemProps> = ({
  item,
  testIdPrefix,
  onCardPress,
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
        onCardPress?.();
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: { market, source: PERPS_EVENT_VALUE.SOURCE.EXPLORE },
        });
      }}
    />
  );
};

export default PerpsTileRowItem;
