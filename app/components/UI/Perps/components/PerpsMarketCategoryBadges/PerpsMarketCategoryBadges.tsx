import React, { useCallback, useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
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
import { useHasNewMarkets } from '../../hooks/useHasNewMarkets';
import { useHorizontalScrollToSelected } from '../../hooks/useHorizontalScrollToSelected';

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

  const {
    scrollViewRef,
    handleItemLayout,
    handleScroll,
    handleScrollViewLayout,
  } = useHorizontalScrollToSelected({
    selectedKey: selectedCategory === 'all' ? undefined : selectedCategory,
    delay: ANIMATION_DURATION + 100,
  });

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
      ref={scrollViewRef as React.RefObject<Animated.ScrollView>}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
      onScroll={handleScroll}
      onLayout={handleScrollViewLayout}
      scrollEventThrottle={16}
      testID={testID}
    >
      {/* Watchlist star badge — shown first */}
      {showWatchlistBadge && (
        <Animated.View
          entering={FadeIn.duration(ANIMATION_DURATION)}
          layout={LinearTransition.duration(ANIMATION_DURATION)}
          onLayout={(e) => handleItemLayout('watchlist', e)}
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
            onLayout={(e) => handleItemLayout(category.id, e)}
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
