import React, { useMemo } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';
import { TextColor } from '@metamask/design-system-react-native';
import PerpsTokenLogo from '../../../../UI/Perps/components/PerpsTokenLogo';
import type { PerpsNavigationParamList } from '../../../../UI/Perps/types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import ExplorePill from '../../components/ExplorePill';
import type { PerpsFeedItem } from './usePerpsFeed';

const LOGO_SIZE = 24;

type PerpsMarketDetailsSource =
  (typeof PERPS_EVENT_VALUE.SOURCE)[keyof typeof PERPS_EVENT_VALUE.SOURCE];

interface PerpsPillItemProps {
  item: PerpsFeedItem;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Overrides the default market-details navigation after `onCardPress` runs. */
  onNavigateToMarketDetails?: (market: PerpsFeedItem['market']) => void;
  /**
   * `params.source` for market-details navigation. Defaults to Explore so Now-tab
   * movers stay unchanged; homepage passes `HOME_SECTION` to match `PerpsSection` tiles.
   */
  marketDetailsSource?: PerpsMarketDetailsSource;
}

const PerpsPillItem: React.FC<PerpsPillItemProps> = ({
  item,
  onCardPress,
  onNavigateToMarketDetails,
  marketDetailsSource = PERPS_EVENT_VALUE.SOURCE.EXPLORE,
}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { market } = item;

  const { changeLabel, changeTextColor } = useMemo(() => {
    const raw = market.change24hPercent;
    const n = parseFloat(String(raw));
    if (raw == null || raw === '' || Number.isNaN(n)) {
      return {
        changeLabel: undefined,
        changeTextColor: TextColor.TextAlternative,
      };
    }
    if (n === 0) {
      return {
        changeLabel: '0.00%',
        changeTextColor: TextColor.TextAlternative,
      };
    }
    return {
      changeLabel: `${n > 0 ? '+' : ''}${n.toFixed(2)}%`,
      changeTextColor:
        n > 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault,
    };
  }, [market.change24hPercent]);

  const onPress = () => {
    onCardPress?.();
    if (onNavigateToMarketDetails) {
      onNavigateToMarketDetails(market);
      return;
    }
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: { market, source: marketDetailsSource },
    });
  };

  return (
    <ExplorePill
      onPress={onPress}
      testID={`perps-market-tile-card-${market.symbol}`}
      leading={
        <PerpsTokenLogo
          symbol={market.symbol}
          size={LOGO_SIZE}
          recyclingKey={market.symbol}
        />
      }
      title={getPerpsDisplaySymbol(market.symbol)}
      changeLabel={changeLabel}
      changeTextColor={changeTextColor}
    />
  );
};

export default React.memo(PerpsPillItem);
