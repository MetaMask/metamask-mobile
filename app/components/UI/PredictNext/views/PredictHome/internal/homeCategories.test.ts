import { IconName } from '@metamask/design-system-react-native';
import type { PredictVenueCapabilities } from '../../../capabilities';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../../contracts/v1/fixtures/kalshiVenueCatalog';
import { parsePredictVenueCatalog } from '../../../contracts/v1/venueCatalog';
import type { PredictVenueId } from '../../../types';
import { getHomeCategoryIcon, resolveHomeCategories } from './homeCategories';

const KALSHI = 'kalshi' as PredictVenueId;

const readyCapabilities = (
  catalogOverrides: Record<string, unknown> = {},
): PredictVenueCapabilities => {
  const catalog = parsePredictVenueCatalog(
    { ...KALSHI_STATIC_VENUE_CATALOG, ...catalogOverrides },
    KALSHI,
  );
  if (!catalog) {
    throw new Error('Expected valid catalog');
  }
  return {
    status: 'ready',
    descriptor: {
      ...catalog,
      displayName: 'Kalshi',
    },
  };
};

describe('getHomeCategoryIcon', () => {
  it.each([
    ['politics', IconName.Global],
    ['sports', IconName.Trophy],
    ['crypto', IconName.MoneyBag],
    ['esports', IconName.GameController],
    ['culture', IconName.StarFilled],
    ['finance', IconName.Bank],
    ['tech', IconName.Data],
    ['economics', IconName.Chart],
  ] as const)('maps %s to %s', (categoryId, expectedIcon) => {
    const icon = getHomeCategoryIcon(categoryId);

    expect(icon).toBe(expectedIcon);
  });

  it('falls back to Explore for an unmapped category', () => {
    const icon = getHomeCategoryIcon('weather');

    expect(icon).toBe(IconName.Explore);
  });
});

describe('resolveHomeCategories', () => {
  it('returns an empty list when capabilities are not ready', () => {
    const categories = resolveHomeCategories({ status: 'loading' });

    expect(categories).toEqual([]);
  });

  it('resolves catalog categories with icons, feed screens, and matching tabs', () => {
    const capabilities = readyCapabilities();

    const categories = resolveHomeCategories(capabilities);

    expect(categories).toEqual([
      {
        id: 'sports',
        label: 'Sports',
        iconName: IconName.Trophy,
        feedScreenId: 'sports',
        tabId: 'nfl',
      },
      {
        id: 'politics',
        label: 'Politics',
        iconName: IconName.Global,
        feedScreenId: 'politics',
        tabId: 'trump',
      },
    ]);
  });

  it('skips categories that have no feed screen', () => {
    const capabilities = readyCapabilities({
      feeds: {
        ...KALSHI_STATIC_VENUE_CATALOG.feeds,
        crypto: 'crypto',
      },
      categories: ['crypto', 'politics'],
    });

    const categories = resolveHomeCategories(capabilities);

    expect(categories.map((category) => category.id)).toEqual(['politics']);
  });
});
