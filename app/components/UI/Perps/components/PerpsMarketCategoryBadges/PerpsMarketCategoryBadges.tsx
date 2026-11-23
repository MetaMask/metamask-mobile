import React, { useCallback, useMemo } from 'react';
import {
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsMarketCategoryBadgesProps } from './PerpsMarketCategoryBadges.types';
import { type MarketTypeFilter } from '@metamask/perps-controller';
import {
  usePerpsCategories,
  NEW_CATEGORY,
  type PerpsCategory,
} from '../../hooks/usePerpsCategories';
import { useHasNewMarkets } from '../../hooks/useHasNewMarkets';
import {
  getCategoryIconName,
  MEMECOIN_CATEGORY_ID,
} from '../../constants/categoryIcons';
import PerpsSentimentSatisfiedIcon, {
  PERPS_SENTIMENT_ICON_SIZE_SM,
} from '../PerpsSentimentSatisfiedIcon/PerpsSentimentSatisfiedIcon';
import { useTheme } from '../../../../../util/theme';

const WATCHLIST_FILTER_VALUE = 'watchlist';

/**
 * PerpsMarketCategoryBadges - Container for category filter badges
 *
 * Categories are derived from live market data via `usePerpsCategories`.
 * The `'new'` badge is automatically appended when any market was listed
 * within the last 30 days (see `useHasNewMarkets`).
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
  const { colors } = useTheme();

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

  const renderCategoryFilterButton = (category: PerpsCategory) => {
    const isMemecoin = category.id === MEMECOIN_CATEGORY_ID;
    const isSelected = groupValue === category.id;

    return (
      <FilterButton
        key={category.id}
        value={category.id}
        // `startIconName` and `startAccessory` are mutually exclusive in
        // ButtonBase — it only renders the accessory when no icon name is set.
        startIconName={
          isMemecoin ? undefined : getCategoryIconName(category.id)
        }
        startIconProps={isMemecoin ? undefined : { size: IconSize.Sm }}
        startAccessory={
          isMemecoin ? (
            <PerpsSentimentSatisfiedIcon
              size={PERPS_SENTIMENT_ICON_SIZE_SM}
              // FilterButton recolours `startIconName` but passes
              // `startAccessory` through untouched, so mirror its variants:
              // selected renders ButtonPrimary (`text-primary-inverse`),
              // unselected renders ButtonTertiary (`IconColor.IconAlternative`).
              color={
                isSelected ? colors.primary.inverse : colors.icon.alternative
              }
            />
          ) : undefined
        }
        testID={testID ? `${testID}-${category.id}` : undefined}
      >
        {category.label}
      </FilterButton>
    );
  };

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
      {displayCategories.map(renderCategoryFilterButton)}
    </FilterButtonGroup>
  );
};

export default PerpsMarketCategoryBadges;
