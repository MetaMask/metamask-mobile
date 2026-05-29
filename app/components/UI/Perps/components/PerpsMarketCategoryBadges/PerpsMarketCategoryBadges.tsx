import React, { useCallback, useMemo } from 'react';
import {
  SegmentButton,
  SegmentButtonVariant,
  SegmentGroup,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PerpsMarketCategoryBadgesProps,
  CategorySegmentConfig,
} from './PerpsMarketCategoryBadges.types';
import { type MarketTypeFilter } from '@metamask/perps-controller';

const ALL_CATEGORY: CategorySegmentConfig = {
  category: 'all',
  labelKey: 'perps.home.all',
};

const DEFAULT_CATEGORIES: CategorySegmentConfig[] = [
  { category: 'crypto', labelKey: 'perps.home.tabs.crypto' },
  { category: 'stocks', labelKey: 'perps.home.tabs.stocks' },
  { category: 'commodities', labelKey: 'perps.home.tabs.commodities' },
  { category: 'forex', labelKey: 'perps.home.tabs.forex' },
  { category: 'new', labelKey: 'perps.home.tabs.new' },
];

/**
 * PerpsMarketCategoryBadges - Category filter segments for the markets list
 *
 * Renders an "All" reset segment followed by market type segments.
 * Search and category filters compose in usePerpsMarketListView.
 */
const PerpsMarketCategoryBadges: React.FC<PerpsMarketCategoryBadgesProps> = ({
  selectedCategory,
  onCategorySelect,
  availableCategories,
  testID,
}) => {
  const displayCategories = useMemo(() => {
    const categories =
      !availableCategories || availableCategories.length === 0
        ? DEFAULT_CATEGORIES
        : DEFAULT_CATEGORIES.filter((config) =>
            availableCategories.includes(
              config.category as Exclude<MarketTypeFilter, 'all'>,
            ),
          );

    return [ALL_CATEGORY, ...categories];
  }, [availableCategories]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      onCategorySelect(value as MarketTypeFilter);
    },
    [onCategorySelect],
  );

  return (
    <SegmentGroup
      value={selectedCategory}
      onChange={handleCategoryChange}
      variant={SegmentButtonVariant.Primary}
      twClassName="px-4 py-2"
      testID={testID}
    >
      {displayCategories.map((config) => (
        <SegmentButton
          key={config.category}
          value={config.category}
          testID={testID ? `${testID}-${config.category}` : undefined}
        >
          {strings(config.labelKey)}
        </SegmentButton>
      ))}
    </SegmentGroup>
  );
};

export default PerpsMarketCategoryBadges;
