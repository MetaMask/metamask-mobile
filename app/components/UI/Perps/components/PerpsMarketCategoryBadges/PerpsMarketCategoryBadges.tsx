import React, { useCallback, useMemo } from 'react';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import PerpsMarketCategoryBadge from '../PerpsMarketCategoryBadge';
import { styleSheet } from './PerpsMarketCategoryBadges.styles';
import type {
  PerpsMarketCategoryBadgesProps,
  CategoryBadgeConfig,
} from './PerpsMarketCategoryBadges.types';
import { type MarketTypeFilter } from '@metamask/perps-controller';

// Animation configuration
const ANIMATION_DURATION = 250;

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
 * Displays category pills and, when the user has watchlist items, a leading star
 * badge that filters the list to watchlisted markets only. The watchlist badge
 * and category badges are mutually exclusive — selecting one deselects the other.
 *
 * Tapping an already-selected badge deselects it (toggles back to 'all' / off).
 *
 * @example
 * ```tsx
 * <PerpsMarketCategoryBadges
 *   selectedCategory={selectedCategory}
 *   onCategorySelect={handleCategorySelect}
 *   availableCategories={['crypto', 'stocks']}
 *   showWatchlistBadge={watchlistMarkets.length > 0}
 *   isWatchlistSelected={showFavoritesOnly}
 *   onWatchlistToggle={handleWatchlistToggle}
 * />
 * ```
 */
const PerpsMarketCategoryBadges: React.FC<PerpsMarketCategoryBadgesProps> = ({
  selectedCategory,
  onCategorySelect,
  availableCategories,
  showWatchlistBadge = false,
  isWatchlistSelected = false,
  onWatchlistToggle,
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

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
      testID={testID}
    >
      {/* Watchlist star badge — shown first, only when user has watchlist items */}
      {showWatchlistBadge && (
        <Animated.View
          entering={FadeIn.duration(ANIMATION_DURATION)}
          layout={LinearTransition.duration(ANIMATION_DURATION)}
        >
          <PerpsMarketCategoryBadge
            icon={IconName.StarFilled}
            accessibilityLabel={strings('perps.watchlist.filter_badge_label')}
            isSelected={isWatchlistSelected}
            onPress={onWatchlistToggle ?? (() => undefined)}
            testID={testID ? `${testID}-watchlist` : undefined}
          />
        </Animated.View>
      )}

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
              accessibilityLabel={strings(config.labelKey)}
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
