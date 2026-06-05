import React, { useCallback, useMemo } from 'react';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import PerpsMarketCategoryBadge from '../PerpsMarketCategoryBadge';
import { styleSheet } from './PerpsMarketCategoryBadges.styles';
import type { PerpsMarketCategoryBadgesProps } from './PerpsMarketCategoryBadges.types';
import { type MarketTypeFilter } from '@metamask/perps-controller';
import {
  usePerpsCategories,
  type PerpsCategory,
} from '../../hooks/usePerpsCategories';

const ANIMATION_DURATION = 250;

const NEW_CATEGORY: PerpsCategory = {
  id: 'new',
  label: strings('perps.home.tabs.new'),
};

/**
 * PerpsMarketCategoryBadges - Container for category filter badges
 *
 * Categories are derived from live market data via `usePerpsCategories`.
 * The `'new'` sentinel is appended when `includeNew` is set and new markets
 * exist (determined by the `availableCategories` prop including `'new'`).
 *
 * The selected category is visually highlighted.
 * Tapping a selected badge again deselects it (toggles back to 'all').
 */
const PerpsMarketCategoryBadges: React.FC<PerpsMarketCategoryBadgesProps> = ({
  selectedCategory,
  onCategorySelect,
  availableCategories,
  includeNew = false,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const categories = usePerpsCategories();

  const displayCategories = useMemo(() => {
    let cats = categories;

    if (includeNew) {
      cats = [...cats, NEW_CATEGORY];
    }

    if (availableCategories && availableCategories.length > 0) {
      cats = cats.filter((c) => availableCategories.includes(c.id));
    }

    return cats;
  }, [categories, availableCategories, includeNew]);

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
      {displayCategories.map((cat, index) => {
        const isCategorySelected = selectedCategory === cat.id;
        return (
          <Animated.View
            key={cat.id}
            entering={FadeIn.duration(ANIMATION_DURATION).delay(index * 50)}
            layout={LinearTransition.duration(ANIMATION_DURATION)}
          >
            <PerpsMarketCategoryBadge
              label={cat.label}
              isSelected={isCategorySelected}
              onPress={() => handleCategoryPress(cat.id)}
              testID={testID ? `${testID}-${cat.id}` : undefined}
            />
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
};

export default PerpsMarketCategoryBadges;
