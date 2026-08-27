import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';
import PerpsTokenLogo from '../PerpsTokenLogo';
import Routes from '../../../../../constants/navigation/Routes';
import { formatPercentChange } from '../../../Trending/utils/formatPercentChange';
import { ExplorePill } from '../../../Trending/components/ExplorePill';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const LOGO_SIZE = 24;

type PerpsMarketDetailsSource =
  | (typeof PERPS_EVENT_VALUE.SOURCE)[keyof typeof PERPS_EVENT_VALUE.SOURCE]
  | string;

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
  /**
   * `params.source_section` for market-details navigation.
   * Identifies the specific sub-section within the origin screen.
   */
  marketDetailsSourceSection?: string;
  /** Bound onto market-details route params for downstream transaction attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PerpsPillItem: React.FC<PerpsPillItemProps> = ({
  item,
  onCardPress,
  onNavigateToMarketDetails,
  marketDetailsSource = PERPS_EVENT_VALUE.SOURCE.EXPLORE,
  marketDetailsSourceSection,
  transactionActiveAbTests,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { market } = item;

  const { changeLabel, changeTextColor } = useMemo(
    () => formatPercentChange(market.change24hPercent),
    [market.change24hPercent],
  );

  const onPress = () => {
    onCardPress?.();
    if (onNavigateToMarketDetails) {
      onNavigateToMarketDetails(market);
      return;
    }
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market,
        source: marketDetailsSource,
        ...(marketDetailsSourceSection && {
          source_section: marketDetailsSourceSection,
        }),
        ...(transactionActiveAbTests?.length
          ? { transactionActiveAbTests }
          : {}),
      },
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
