import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';
import PerpsTokenLogo from '../PerpsTokenLogo';
import Routes from '../../../../../constants/navigation/Routes';
import { formatPercentChange } from '../../../Trending/utils/formatPercentChange';
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
    <Button
      onPress={onPress}
      testID={`perps-market-tile-card-${market.symbol}`}
      startAccessory={
        <PerpsTokenLogo
          symbol={market.symbol}
          size={LOGO_SIZE}
          recyclingKey={market.symbol}
        />
      }
      size={ButtonSize.Md}
      variant={ButtonVariant.Secondary}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {getPerpsDisplaySymbol(market.symbol)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={changeTextColor}
          numberOfLines={1}
        >
          {changeLabel}
        </Text>
      </Box>
    </Button>
  );
};

export default React.memo(PerpsPillItem);
