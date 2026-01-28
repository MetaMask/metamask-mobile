import React, { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import PerpsMarketCategoryBadge from '../PerpsMarketCategoryBadge';
import { styleSheet } from './PerpsMarketCategoryBadges.styles';
import type {
  PerpsMarketCategoryBadgesProps,
  CategoryBadgeConfig,
} from './PerpsMarketCategoryBadges.types';
import type { MarketTypeFilter } from '../../controllers/types';

/**
 * Default category badge configurations
 * Order determines display order in the UI
 */
const DEFAULT_CATEGORIES: CategoryBadgeConfig[] = [
  { category: 'crypto', labelKey: 'perps.home.tabs.crypto' },
  { category: 'stocks', labelKey: 'perps.home.tabs.stocks' },
  { category: 'commodities', labelKey: 'perps.home.tabs.commodities' },
  { category: 'forex', labelKey: 'perps.home.tabs.forex' },
  { category: 'new', labelKey: 'perps.home.tabs.new' },
];

/**
 * PerpsMarketCategoryBadges - Container for category filter badges
 *
 * Displays category badges for filtering markets:
 * - When 'all' is selected: Shows all category badges as options
 * - When a specific category is selected: Shows only that badge with dismiss "×"
 *
 * @example
 * ```tsx
 * <PerpsMarketCategoryBadges
 *   selectedCategory={selectedCategory}
 *   onCategorySelect={handleCategorySelect}
 *   availableCategories={['crypto', 'stocks']}
 * />
 * ```
 */
const PerpsMarketCategoryBadges: React.FC<PerpsMarketCategoryBadgesProps> = ({
  selectedCategory,
  onCategorySelect,
  availableCategories,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Filter categories based on availableCategories prop
  // Show all default categories if availableCategories is undefined/null/empty
  const displayCategories = useMemo(() => {
    if (!availableCategories || availableCategories.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    return DEFAULT_CATEGORIES.filter((config) =>
      availableCategories.includes(config.category),
    );
  }, [availableCategories]);

  // Handle selecting a category
  const handleCategoryPress = useCallback(
    (category: Exclude<MarketTypeFilter, 'all'>) => {
      onCategorySelect(category);
    },
    [onCategorySelect],
  );

  // Handle dismissing (clearing) the selected category
  const handleDismiss = useCallback(() => {
    onCategorySelect('all');
  }, [onCategorySelect]);

  // Determine if we're in "all" state (no filter selected)
  const isAllSelected = selectedCategory === 'all';

  // Find the selected category config (if a specific category is selected)
  const selectedConfig = !isAllSelected
    ? displayCategories.find((config) => config.category === selectedCategory)
    : null;

  // When a specific category is selected AND found in display categories, show only that badge
  // The dismiss handler (onDismiss → handleDismiss → onCategorySelect('all')) handles resetting
  if (selectedConfig) {
    return (
      <View style={styles.container} testID={testID}>
        <PerpsMarketCategoryBadge
          category={selectedConfig.category}
          label={strings(selectedConfig.labelKey)}
          isSelected
          showDismiss
          onPress={() => handleCategoryPress(selectedConfig.category)}
          onDismiss={handleDismiss}
          testID={testID ? `${testID}-${selectedConfig.category}` : undefined}
        />
      </View>
    );
  }

  // "All" state OR fallback when selected category not found: show all category badges
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
      testID={testID}
    >
      {displayCategories.map((config) => (
        <PerpsMarketCategoryBadge
          key={config.category}
          category={config.category}
          label={strings(config.labelKey)}
          isSelected={false}
          showDismiss={false}
          onPress={() => handleCategoryPress(config.category)}
          testID={testID ? `${testID}-${config.category}` : undefined}
        />
      ))}
    </ScrollView>
  );
};

export default PerpsMarketCategoryBadges;
