import React, { useCallback, useMemo } from 'react';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import PerpsMarketCategoryBadge from '../PerpsMarketCategoryBadge';
import { styleSheet } from './PerpsMarketCategoryBadges.styles';
import type {
  PerpsMarketCategoryBadgesProps,
  CategoryBadgeConfig,
} from './PerpsMarketCategoryBadges.types';
import {
  MARKET_CATEGORIES,
  type MarketTypeFilter,
} from '@metamask/perps-controller';

// Animation configuration
const ANIMATION_DURATION = 250;

/**
 * Category badge configurations derived from the controller-provided constant.
 * 'new' is appended separately as it's a UI-only sentinel, not a data-model category.
 */
const DEFAULT_CATEGORIES: CategoryBadgeConfig[] = [
  ...MARKET_CATEGORIES.map((category) => ({
    category,
    labelKey: `perps.home.tabs.${category.replace(/-/g, '_')}`,
  })),
  { category: 'new', labelKey: 'perps.home.tabs.new' },
];

/**
 * PerpsMarketCategoryBadges - Container for category filter badges
 *
 * Always displays all category badges in a horizontal scroll.
 * The selected category is visually highlighted.
 * Tapping a selected badge again deselects it (toggles back to 'all').
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

  // Handle selecting/toggling a category
  // Tapping an already-selected pill deselects it (back to 'all')
  const handleCategoryPress = useCallback(
    (category: Exclude<MarketTypeFilter, 'all'>) => {
      if (selectedCategory === category) {
        onCategorySelect('all');
      } else {
        onCategorySelect(category);
      }
    },
    [onCategorySelect, selectedCategory],
  );

  // Always show all category badges; highlight the selected one
  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
      testID={testID}
    >
      {displayCategories.map((config, index) => {
        const isCategorySelected = selectedCategory === config.category;
        return (
          <Animated.View
            key={config.category}
            entering={FadeIn.duration(ANIMATION_DURATION).delay(index * 50)}
            layout={LinearTransition.duration(ANIMATION_DURATION)}
          >
            <PerpsMarketCategoryBadge
              label={strings(config.labelKey)}
              isSelected={isCategorySelected}
              onPress={() => handleCategoryPress(config.category)}
              testID={testID ? `${testID}-${config.category}` : undefined}
            />
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
};

export default PerpsMarketCategoryBadges;
