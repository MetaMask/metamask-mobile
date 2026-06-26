import React, { useCallback, useMemo } from 'react';
import {
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsMarketCategoryBadgesProps } from './PerpsMarketCategoryBadges.types';
import { type MarketTypeFilter } from '@metamask/perps-controller';
import {
  usePerpsCategories,
  type PerpsCategory,
} from '../../hooks/usePerpsCategories';
import { useHasNewMarkets } from '../../hooks/useHasNewMarkets';

const WATCHLIST_FILTER_VALUE = 'watchlist';

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
 * Uses MMDS FilterButtonGroup with an explicit "All" reset filter.
 */
const PerpsMarketCategoryBadges: React.FC<PerpsMarketCategoryBadgesProps> = ({
  selectedCategory,
  onCategorySelect,
  showWatchlistBadge = false,
  isWatchlistSelected = false,
  onWatchlistToggle,
  testID,
}) => {
  const categories = usePerpsCategories();
  const hasNewMarkets = useHasNewMarkets();

  const displayCategories = useMemo(
    () => (hasNewMarkets ? [...categories, NEW_CATEGORY] : categories),
    [categories, hasNewMarkets],
  );

  const groupValue = isWatchlistSelected
    ? WATCHLIST_FILTER_VALUE
    : selectedCategory;

  const handleFilterChange = useCallback(
    (value: string) => {
      if (value === WATCHLIST_FILTER_VALUE) {
        if (!isWatchlistSelected) {
          onWatchlistToggle?.();
        }
        return;
      }

      if (value === 'all') {
        onCategorySelect('all');
        if (isWatchlistSelected) {
          onWatchlistToggle?.();
        }
        return;
      }

      onCategorySelect(value as MarketTypeFilter);
    },
    [isWatchlistSelected, onCategorySelect, onWatchlistToggle],
  );

  return (
    <FilterButtonGroup
      value={groupValue}
      onChange={handleFilterChange}
      variant={FilterButtonVariant.Primary}
      twClassName="px-4 py-2"
      testID={testID}
    >
      {showWatchlistBadge && (
        <FilterButton
          value={WATCHLIST_FILTER_VALUE}
          startIconName={IconName.StarFilled}
          startIconProps={{
            color: isWatchlistSelected
              ? IconColor.PrimaryInverse
              : IconColor.IconAlternative,
          }}
          accessibilityLabel={strings('perps.watchlist.filter_badge_label')}
          testID={testID ? `${testID}-watchlist` : undefined}
          contentWrapperProps={{ gap: 0 }}
        >
          {null}
        </FilterButton>
      )}
      <FilterButton value="all" testID={testID ? `${testID}-all` : undefined}>
        {strings('perps.home.tabs.all')}
      </FilterButton>
      {displayCategories.map((category) => (
        <FilterButton
          key={category.id}
          value={category.id}
          testID={testID ? `${testID}-${category.id}` : undefined}
        >
          {category.label}
        </FilterButton>
      ))}
    </FilterButtonGroup>
  );
};

export default PerpsMarketCategoryBadges;
