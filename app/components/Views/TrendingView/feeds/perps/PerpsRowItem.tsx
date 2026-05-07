import React from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../../../../UI/Perps/components/PerpsMarketRowItem';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';

interface PerpsRowItemProps {
  market: PerpsMarketData;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
}

/** Compact list row for perps — used by pill-toggled lists and search. */
const PerpsRowItem: React.FC<PerpsRowItemProps> = ({ market, onCardPress }) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  return (
    <PerpsMarketRowItem
      market={market}
      onPress={() => {
        onCardPress?.();
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: { market, source: PERPS_EVENT_VALUE.SOURCE.EXPLORE },
        });
      }}
      showBadge={false}
      compact
    />
  );
};

export default PerpsRowItem;
