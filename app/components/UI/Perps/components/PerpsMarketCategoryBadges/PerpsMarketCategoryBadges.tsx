import React, { useCallback, useMemo } from 'react';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import PerpsMarketCategoryBadge from '../PerpsMarketCategoryBadge';
import { styleSheet } from './PerpsMarketCategoryBadges.styles';
import type { PerpsMarketCategoryBadgesProps } from './PerpsMarketCategoryBadges.types';
import { type MarketTypeFilter } from '@metamask/perps-controller';
import {
  usePerpsCategories,
  type PerpsCategory,
} from '../../hooks/usePerpsCategories';
import { useHasNewMarkets } from '../../hooks/useHasNewMarkets';

const ANIMATION_DURATION = 250;

const NEW_CATEGORY: PerpsCategory = {
  id: 'new',
  label: strings('perps.home.tabs.new'),
};

/**
 * PerpsMarketCategoryBadges - Container for category filter badges
 *
 * Categories are derived from live market data via `usePerpsCategories`.
 * The `'new'` badge is automatically appended when any market has
 * `isNewMarket` set.
 *
 * The selected category is visually highlighted.
 * Tapping a selected badge again deselects it (toggles back to 'all').
 */
const PerpsMarketCategoryBadges: React.FC<PerpsMarketCategoryBadgesProps> = ({
  selectedCategory,
  onCategorySelect,
  showWatchlistBadge = false,
  isWatchlistSelected = false,
  onWatchlistToggle,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const categories = usePerpsCategories();
  const hasNewMarkets = useHasNewMarkets();

  const displayCategories = useMemo(
    () => (hasNewMarkets ? [...categories, NEW_CATEGORY] : categories),
    [categories, hasNewMarkets],
  );

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
      {/* Watchlist star badge — shown first */}
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
      {displayCategories.map((category, index) => {
        const isCategorySelected = selectedCategory === category.id;
        return (
          <Animated.View
            key={category.id}
            entering={FadeIn.duration(ANIMATION_DURATION).delay(index * 50)}
            layout={LinearTransition.duration(ANIMATION_DURATION)}
          >
            <PerpsMarketCategoryBadge
              label={category.label}
              accessibilityLabel={category.label}
              isSelected={isCategorySelected}
              onPress={() => handleCategoryPress(category.id)}
              testID={testID ? `${testID}-${category.id}` : undefined}
            />
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
};

export default PerpsMarketCategoryBadges;
