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
    ['trending', IconName.TrendUp],
    ['football', IconName.Football],
    ['basketball', IconName.Basketball],
    ['politics', IconName.Global],
    ['sports', IconName.Trophy],
    ['crypto', IconName.MoneyBag],
    ['esports', IconName.GameController],
    ['culture', IconName.StarFilled],
    ['finance', IconName.Cash],
    ['tech', IconName.Monitor],
    ['economics', IconName.Chart],
  ] as const)('maps %s to %s', (categoryId, expectedIcon) => {
    const icon = getHomeCategoryIcon(categoryId);

    expect(icon).toBe(expectedIcon);
  });

  it('falls back to Explore for an unmapped category', () => {
    const icon = getHomeCategoryIcon('weather');

    expect(icon).toBe(IconName.Explore);
  });

  it('prefers a catalog icon that names a design-system icon over the map', () => {
    const icon = getHomeCategoryIcon('politics', 'Bank');

    expect(icon).toBe(IconName.Bank);
  });

  it.each([
    ['an unknown name', 'politics', 'Microphone', IconName.Global],
    ['an empty name', 'politics', '', IconName.Global],
    ['a differently cased name', 'politics', 'bank', IconName.Global],
    [
      'an unknown name for an unmapped category',
      'weather',
      'Microphone',
      IconName.Explore,
    ],
  ] as const)(
    'ignores a catalog icon with %s',
    (_case, categoryId, catalogIcon, expectedIcon) => {
      const icon = getHomeCategoryIcon(categoryId, catalogIcon);

      expect(icon).toBe(expectedIcon);
    },
  );
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
        feedScreenId: 'sports',
        tabId: 'nfl',
      },
      {
        id: 'politics',
        label: 'Politics',
        feedScreenId: 'politics',
        tabId: 'trump',
      },
    ]);
  });

  it("carries each Feed Screen's catalog icon and the app's label for a localized Category", () => {
    const capabilities = readyCapabilities({
      feeds: { ...KALSHI_STATIC_VENUE_CATALOG.feeds, tech: 'tech' },
      categories: ['tech', 'politics'],
      screens: [
        {
          id: 'tech',
          title: 'Technology',
          icon: 'Monitor',
          tabs: [{ id: 'all', title: 'All', feed: 'tech' }],
        },
        {
          id: 'politics',
          title: 'Politics',
          tabs: [{ id: 'trump', title: 'Trump', feed: 'politics-trump' }],
        },
      ],
    });

    const categories = resolveHomeCategories(capabilities);

    expect(
      categories.map(({ id, label, icon }) => ({ id, label, icon })),
    ).toEqual([
      { id: 'tech', label: 'Tech', icon: 'Monitor' },
      { id: 'politics', label: 'Politics', icon: undefined },
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
