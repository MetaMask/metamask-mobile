import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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

  const scrollViewRef = useRef<{
    scrollTo(opts: { x: number; animated: boolean }): void;
  } | null>(null);
  const badgeLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const scrollOffsetRef = useRef(0);
  const viewportWidthRef = useRef(0);

  const displayCategories = useMemo(
    () => (hasNewMarkets ? [...categories, NEW_CATEGORY] : categories),
    [categories, hasNewMarkets],
  );

  const handleBadgeLayout = useCallback(
    (categoryId: string, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      badgeLayoutsRef.current[categoryId] = { x, width };
    },
    [],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    },
    [],
  );

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      return;
    }
    const timer = setTimeout(() => {
      const layout = badgeLayoutsRef.current[selectedCategory];
      if (!layout || !scrollViewRef.current) {
        return;
      }

      const badgeLeft = layout.x;
      const badgeRight = layout.x + layout.width;
      const visibleLeft = scrollOffsetRef.current;
      const visibleRight = visibleLeft + viewportWidthRef.current;

      const isFullyVisible =
        badgeLeft >= visibleLeft && badgeRight <= visibleRight;
      if (!isFullyVisible) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, layout.x - 16),
          animated: true,
        });
      }
    }, ANIMATION_DURATION + 100);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

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
          onLayout={(e) => handleBadgeLayout('watchlist', e)}
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
            onLayout={(e) => handleBadgeLayout(category.id, e)}
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
