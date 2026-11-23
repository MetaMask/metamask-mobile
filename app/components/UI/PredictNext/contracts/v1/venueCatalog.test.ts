import Logger from '../../../../../util/Logger';
import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictVenueId } from '../../types';
import { parsePredictVenueCatalog } from './venueCatalog';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const venueId = 'kalshi' as PredictVenueId;

const createCatalog = (overrides: Record<string, unknown> = {}) => ({
  venueId: 'kalshi',
  actions: ['buy', 'sell'],
  feeds: {
    'nfl-games': 'sports-football-nfl-games',
    'nfl-props': 'sports-football-nfl-win-totals',
  },
  searchSupported: true,
  ...overrides,
});

const expectInvalidCatalog = (value: unknown) => {
  let caught: unknown;
  try {
    parsePredictVenueCatalog(value, venueId);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PredictError);
  expect((caught as PredictError).code).toBe(PredictErrorCode.INVALID_RESPONSE);
};

describe('parsePredictVenueCatalog', () => {
  beforeEach(() => {
    jest.mocked(Logger.log).mockClear();
  });

  it('parses a valid legacy catalog when environment is omitted without defaulting to production', () => {
    const result = parsePredictVenueCatalog(createCatalog(), venueId);

    expect(result).toEqual({
      venueId: 'kalshi',
      actions: ['buy', 'sell'],
      feeds: {
        'nfl-games': 'sports-football-nfl-games',
        'nfl-props': 'sports-football-nfl-win-totals',
      },
      categories: [],
      searchSupported: true,
      screens: [],
    });
    expect(result.environment).toBeUndefined();
  });

  it.each(['sandbox', 'production'] as const)(
    'accepts environment %s',
    (environment) => {
      const result = parsePredictVenueCatalog(
        createCatalog({ environment }),
        venueId,
      );

      expect(result.environment).toBe(environment);
    },
  );

  it('keeps the Categories in catalog order', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({ categories: ['nfl-props', 'nfl-games'] }),
      venueId,
    );

    expect(result.categories).toEqual(['nfl-props', 'nfl-games']);
  });

  it('logs nothing for valid Categories or a catalog without the field', () => {
    parsePredictVenueCatalog(
      createCatalog({ categories: ['nfl-games'] }),
      venueId,
    );
    const legacy = parsePredictVenueCatalog(createCatalog(), venueId);

    expect(legacy.categories).toEqual([]);
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('drops duplicate and Feed-less Categories, and logs them', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({
        feeds: {
          'nfl-games': 'sports-football-nfl-games',
          'curling-live': 'curling',
        },
        categories: ['curling-live', 'nfl-games', 'politics', 'nfl-games'],
      }),
      venueId,
    );

    expect(result.categories).toEqual(['curling-live', 'nfl-games']);
    expect(Logger.log).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      '[PredictNext] Dropped 2 Venue catalog Categories for kalshi',
      { dropped: ['politics', 'nfl-games'] },
    );
  });

  it('keeps the valid Categories, actions, Feeds and search when an entry is not a string', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({
        categories: [7, 'nfl-props', { key: 'nfl-games' }, null, 'nfl-games'],
      }),
      venueId,
    );

    expect(result).toEqual({
      venueId: 'kalshi',
      actions: ['buy', 'sell'],
      feeds: {
        'nfl-games': 'sports-football-nfl-games',
        'nfl-props': 'sports-football-nfl-win-totals',
      },
      categories: ['nfl-props', 'nfl-games'],
      searchSupported: true,
      screens: [],
    });
    expect(Logger.log).toHaveBeenCalledWith(
      '[PredictNext] Dropped 3 Venue catalog Categories for kalshi',
      { dropped: [7, { key: 'nfl-games' }, null] },
    );
  });

  it.each([
    ['a string', 'nfl-games'],
    ['an object', { 'nfl-games': true }],
    ['null', null],
  ])(
    'keeps the rest of the catalog with no Categories when categories is %s',
    (_name, categories) => {
      const result = parsePredictVenueCatalog(
        createCatalog({ categories }),
        venueId,
      );

      expect(result.categories).toEqual([]);
      expect(result.actions).toEqual(['buy', 'sell']);
      expect(result.feeds).toEqual({
        'nfl-games': 'sports-football-nfl-games',
        'nfl-props': 'sports-football-nfl-win-totals',
      });
      expect(Logger.log).toHaveBeenCalledWith(
        '[PredictNext] Dropped 1 Venue catalog Category for kalshi',
        { dropped: [categories] },
      );
    },
  );

  it('drops unknown and duplicate actions', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({ actions: ['buy', 'teleport', 'buy', 'withdraw'] }),
      venueId,
    );

    expect(result.actions).toEqual(['buy', 'withdraw']);
  });

  it('keeps a Feed key the app has never seen, because the API owns the vocabulary', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({
        feeds: { 'nfl-games': 'nfl-games-feed', 'curling-live': 'curling' },
      }),
      venueId,
    );

    expect(result.feeds).toEqual({
      'nfl-games': 'nfl-games-feed',
      'curling-live': 'curling',
    });
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('drops and logs a Feed that is not kebab-case or has no Feed ID, and keeps the rest', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({
        feeds: {
          'nfl-games': 'nfl-games-feed',
          'NFL Props': 'nfl-props-feed',
          'nfl-live': '',
          'nfl-odds': 7,
        },
        categories: ['nfl-games', 'nfl-live'],
      }),
      venueId,
    );

    expect(result.feeds).toEqual({ 'nfl-games': 'nfl-games-feed' });
    expect(result.categories).toEqual(['nfl-games']);
    expect(Logger.log).toHaveBeenCalledWith(
      '[PredictNext] Dropped 3 Venue catalog Feeds for kalshi',
      { dropped: ['NFL Props', 'nfl-live', 'nfl-odds'] },
    );
  });

  it('ignores unknown top-level fields', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({ displayMetadata: { title: 'Kalshi' } }),
      venueId,
    );

    expect(result).not.toHaveProperty('displayMetadata');
    expect(result.actions).toEqual(['buy', 'sell']);
  });

  it('accepts a catalog that supports nothing', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({ actions: [], feeds: {}, searchSupported: false }),
      venueId,
    );

    expect(result).toEqual({
      venueId: 'kalshi',
      actions: [],
      feeds: {},
      categories: [],
      searchSupported: false,
      screens: [],
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'kalshi'],
    ['an array', [createCatalog()]],
    ['a missing venueId', createCatalog({ venueId: undefined })],
    ['an empty venueId', createCatalog({ venueId: '' })],
    ['an unknown environment', createCatalog({ environment: 'staging' })],
    ['a non-string environment', createCatalog({ environment: 123 })],
    ['a null environment', createCatalog({ environment: null })],
    ['missing actions', createCatalog({ actions: undefined })],
    ['actions that are not an array', createCatalog({ actions: 'buy' })],
    ['a non-string action', createCatalog({ actions: ['buy', 1] })],
    ['missing feeds', createCatalog({ feeds: undefined })],
    ['feeds that are an array', createCatalog({ feeds: ['nfl-games'] })],
    ['missing searchSupported', createCatalog({ searchSupported: undefined })],
    ['a string searchSupported', createCatalog({ searchSupported: 'true' })],
  ])('rejects %s', (_name, value) => {
    expectInvalidCatalog(value);
  });

  describe('screens', () => {
    const nflScreen = {
      id: 'sports-football-nfl',
      title: 'Sports',
      subtitle: 'NFL',
      tabs: [
        { id: 'games', title: 'Games', feed: 'nfl-games' },
        { id: 'props', title: 'Props', feed: 'nfl-props' },
      ],
    };

    it('keeps the Feed Screens and their tabs in catalog order', () => {
      const sports = {
        id: 'sports',
        title: 'Sports',
        tabs: [{ id: 'nfl', title: 'NFL', feed: 'nfl-games' }],
      };

      const result = parsePredictVenueCatalog(
        createCatalog({ screens: [nflScreen, sports] }),
        venueId,
      );

      expect(result.screens).toEqual([nflScreen, sports]);
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('drops unknown screen and tab fields', () => {
      const result = parsePredictVenueCatalog(
        createCatalog({
          screens: [
            {
              ...nflScreen,
              icon: 'football',
              tabs: [{ ...nflScreen.tabs[0], badge: 'new' }],
            },
          ],
        }),
        venueId,
      );

      expect(result.screens).toEqual([
        { ...nflScreen, tabs: [nflScreen.tabs[0]] },
      ]);
    });

    it('drops a malformed or repeated tab, and a tab on a Feed key missing from feeds, and logs them', () => {
      const badTabs = [
        { id: 'Props', title: 'Props', feed: 'nfl-props' },
        { id: 'live', title: '', feed: 'nfl-games' },
        { id: 'odds', title: 'Odds', feed: 'nfl-odds' },
        { id: 'games', title: 'Games again', feed: 'nfl-props' },
        'props',
      ];

      const result = parsePredictVenueCatalog(
        createCatalog({
          screens: [{ ...nflScreen, tabs: [nflScreen.tabs[0], ...badTabs] }],
        }),
        venueId,
      );

      expect(result.screens).toEqual([
        { ...nflScreen, tabs: [nflScreen.tabs[0]] },
      ]);
      expect(Logger.log).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        '[PredictNext] Dropped 5 Venue catalog Feed Screen tabs for kalshi',
        { dropped: badTabs },
      );
    });

    it('drops a malformed or repeated screen, and one left without tabs, keeping the rest of the catalog', () => {
      const badScreens = [
        { ...nflScreen, id: 'Sports NFL' },
        { ...nflScreen, title: '' },
        { ...nflScreen, tabs: 'games' },
        { ...nflScreen, title: 'Sports again' },
        {
          id: 'curling',
          title: 'Curling',
          tabs: [{ id: 'live', title: 'Live', feed: 'curling-live' }],
        },
        { id: 'empty', title: 'Empty', tabs: [] },
        null,
      ];

      const result = parsePredictVenueCatalog(
        createCatalog({
          categories: ['nfl-games'],
          screens: [nflScreen, ...badScreens],
        }),
        venueId,
      );

      expect(result.screens).toEqual([nflScreen]);
      expect(result.categories).toEqual(['nfl-games']);
      expect(result.actions).toEqual(['buy', 'sell']);
      expect(Logger.log).toHaveBeenCalledWith(
        '[PredictNext] Dropped 7 Venue catalog Feed Screens for kalshi',
        { dropped: badScreens },
      );
    });

    it('drops a subtitle that is not a non-empty string and keeps the screen', () => {
      const result = parsePredictVenueCatalog(
        createCatalog({ screens: [{ ...nflScreen, subtitle: 7 }] }),
        venueId,
      );

      const { subtitle: _subtitle, ...withoutSubtitle } = nflScreen;
      expect(result.screens).toEqual([withoutSubtitle]);
    });

    it.each([
      ['a string', 'sports'],
      ['an object', { id: 'sports' }],
      ['null', null],
    ])(
      'keeps the rest of the catalog with no screens when screens is %s',
      (_name, screens) => {
        const result = parsePredictVenueCatalog(
          createCatalog({ screens }),
          venueId,
        );

        expect(result.screens).toEqual([]);
        expect(result.feeds).toEqual({
          'nfl-games': 'sports-football-nfl-games',
          'nfl-props': 'sports-football-nfl-win-totals',
        });
        expect(Logger.log).toHaveBeenCalledWith(
          '[PredictNext] Dropped 1 Venue catalog Feed Screen for kalshi',
          { dropped: [screens] },
        );
      },
    );
  });

  it('rejects a catalog for another Venue instead of using it', () => {
    expectInvalidCatalog(createCatalog({ venueId: 'polymarket' }));
  });
});
