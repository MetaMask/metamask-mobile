import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsMarketData } from '../../controllers/types';
import { useStyles } from '../../../../../component-library/hooks';
import type { SortField } from '../../utils/sortMarkets';
import PerpsMarketList from '../PerpsMarketList';
import styleSheet from './PerpsMarketTypeSection.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';

export interface PerpsMarketTypeSectionProps {
  /** Section title (e.g., "Perps", "Stocks", "Commodities") */
  title: string;
  /** Markets to display */
  markets: PerpsMarketData[];
  /** Market type for filtering when "See All" is pressed */
  marketType:
    | 'crypto'
    | 'equity'
    | 'commodity'
    | 'forex'
    | 'all'
    | 'stocks_and_commodities';
  /** Sort field for market list */
  sortBy?: SortField;
  /** Whether markets are loading */
  isLoading?: boolean;
  /** Test ID for component */
  testID?: string;
}

/**
 * PerpsMarketTypeSection Component
 *
 * Generic reusable section for displaying markets grouped by type.
 * Used for Perps (crypto), Stocks, Commodities, Forex sections on home screen.
 *
 * Features:
 * - Shows section header with title and "See All" link
 * - Displays market list with sorting
 * - Skeleton loading state
 * - Hides section entirely when no markets available
 * - Navigates to full market list view on "See All"
 *
 * @example
 * ```tsx
 * <PerpsMarketTypeSection
 *   title={strings('perps.home.stocks')}
 *   markets={stocksMarkets}
 *   isLoading={isLoading.markets}
 *   sortBy="volume"
 * />
 * ```
 */
const PerpsMarketTypeSection: React.FC<PerpsMarketTypeSectionProps> = ({
  title,
  markets,
  marketType,
  sortBy = 'volume',
  isLoading,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const handleViewAll = useCallback(() => {
    // Navigate to the specific market type tab when "See all" is pressed
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: marketType,
      },
    });
  }, [navigation, marketType]);

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
    [navigation],
  );

  // Header component - full row is pressable with chevron icon next to title
  const SectionHeader = useCallback(
    () => (
      <TouchableOpacity style={styles.header} onPress={handleViewAll}>
        <View style={styles.titleRow}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {title}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        </View>
      </TouchableOpacity>
    ),
    [styles.header, styles.titleRow, title, handleViewAll],
  );

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <View style={styles.section} testID={testID}>
        <SectionHeader />
        <View style={styles.contentContainer}>
          <PerpsRowSkeleton count={5} />
        </View>
      </View>
    );
  }

  // Hide section entirely when no markets (feature flag controlled)
  if (markets.length === 0) {
    return null;
  }

  // Render market list
  return (
    <View style={styles.section} testID={testID}>
      <SectionHeader />
      <View style={styles.contentContainer}>
        <PerpsMarketList
          markets={markets}
          sortBy={sortBy}
          onMarketPress={handleMarketPress}
          showBadge={false}
        />
      </View>
    </View>
  );
};

export default PerpsMarketTypeSection;
