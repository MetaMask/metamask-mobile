import React, { useCallback } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import { Box, SectionHeader } from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  type PerpsMarketData,
  type MarketTypeFilter,
  type SortField,
} from '@metamask/perps-controller';
import PerpsMarketList from '../PerpsMarketList';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface PerpsMarketTypeSectionProps {
  /** Section title (e.g., "Perps", "Stocks", "Commodities") */
  title: string;
  /** Markets to display */
  markets: PerpsMarketData[];
  /** Market type for filtering when "See All" is pressed */
  marketType: MarketTypeFilter;
  /** Sort field for market list */
  sortBy?: SortField;
  /** Whether markets are loading */
  isLoading?: boolean;
  /** Analytics source identifying the parent screen (e.g., 'perps_home') */
  source?: string;
  /** Sub-section of the parent screen that triggered navigation (e.g., 'crypto'). */
  source_section?: string;
  /** Bound onto market-list/details routes for downstream transaction attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Test ID for component */
  testID?: string;
  /** Optional style override for the section container */
  style?: StyleProp<ViewStyle>;
  /** Optional style override for the header */
  headerStyle?: StyleProp<ViewStyle>;
  /** Optional style override for the content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * PerpsMarketTypeSection Component
 *
 * Generic reusable section for displaying markets grouped by type.
 * Used for Perps (crypto), Stocks, Commodities, Forex sections on home screen.
 */
const PerpsMarketTypeSection: React.FC<PerpsMarketTypeSectionProps> = ({
  title,
  markets,
  marketType,
  sortBy = 'volume',
  isLoading,
  source,
  source_section,
  transactionActiveAbTests,
  testID,
  style,
  contentContainerStyle,
}) => {
  const navigation = useNavigation<AppNavigationProp>();

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: marketType,
        source,
        ...(transactionActiveAbTests?.length
          ? { transactionActiveAbTests }
          : {}),
      },
    });
  }, [navigation, marketType, source, transactionActiveAbTests]);

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          source,
          ...(source_section && { source_section }),
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [navigation, source, source_section, transactionActiveAbTests],
  );

  if (!isLoading && markets.length === 0) {
    return null;
  }

  return (
    <Box style={style} testID={testID}>
      <SectionHeader title={title} isInteractive onPress={handleViewAll} />
      <View style={contentContainerStyle}>
        {isLoading ? (
          <PerpsRowSkeleton count={5} />
        ) : (
          <PerpsMarketList
            markets={markets}
            sortBy={sortBy}
            onMarketPress={handleMarketPress}
            showBadge={false}
          />
        )}
      </View>
    </Box>
  );
};

export default PerpsMarketTypeSection;
