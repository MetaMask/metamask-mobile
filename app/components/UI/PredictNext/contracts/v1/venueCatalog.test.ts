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

  it('parses a valid catalog', () => {
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
  });

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

  describe('home', () => {
    const feeds = {
      'nfl-games': 'sports-football-nfl-games',
      'college-football-games': 'sports-football-ncaa-games',
      'politics-trump': 'politics-trump',
    };
    const trending = {
      kind: 'trending',
      sources: ['nfl-games', 'college-football-games'],
      screen: 'sports',
    };
    const sportsRow = {
      kind: 'games-row',
      id: 'sports',
      title: 'Sports',
      feed: 'nfl-games',
      screen: 'sports-football-nfl',
    };
    const categories = { kind: 'categories' };
    const politics = {
      kind: 'feed-preview',
      id: 'politics',
      title: 'Politics',
      feed: 'politics-trump',
      screen: 'politics',
    };
    const KALSHI_SECTIONS = [trending, sportsRow, categories, politics];
    const parseHome = (home: unknown) =>
      parsePredictVenueCatalog(createCatalog({ feeds, home }), venueId).home;
    const droppedLog = (dropped: unknown[], noun = 'Home section') => [
      `[PredictNext] Dropped ${dropped.length} Venue catalog ${noun}${
        dropped.length === 1 ? '' : 's'
      } for kalshi`,
      { dropped },
    ];

    it("keeps Kalshi's sections in catalog order and logs nothing", () => {
      expect(parseHome({ sections: KALSHI_SECTIONS })).toEqual({
        sections: KALSHI_SECTIONS,
      });
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('keeps a reordered layout as served', () => {
      const sections = [politics, categories, sportsRow, trending];

      expect(parseHome({ sections })).toEqual({ sections });
    });

    it('has no home when the catalog has none, and logs nothing', () => {
      expect(
        parsePredictVenueCatalog(createCatalog({ feeds }), venueId),
      ).not.toHaveProperty('home');
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('keeps an empty layout', () => {
      expect(parseHome({ sections: [] })).toEqual({ sections: [] });
    });

    it.each([
      ['a string', 'sports'],
      ['an array', [trending]],
      ['null', null],
      ['an object without sections', { layout: [] }],
      ['an object whose sections is not an array', { sections: {} }],
    ])(
      'has no home, and keeps the rest of the catalog, when home is %s',
      (_name, home) => {
        const result = parsePredictVenueCatalog(
          createCatalog({ feeds, home }),
          venueId,
        );

        expect(result).not.toHaveProperty('home');
        expect(result.feeds).toEqual(feeds);
        expect(Logger.log).toHaveBeenCalledWith(
          '[PredictNext] Dropped 1 Venue catalog Home for kalshi',
          { dropped: [home] },
        );
      },
    );

    it.each([
      ['an unknown kind', { kind: 'leaderboard', id: 'top' }],
      ['no kind', { id: 'sports', title: 'Sports', feed: 'nfl-games' }],
      ['not an object', 'trending'],
      ['null', null],
      [
        'a games row on a Feed key missing from feeds',
        { ...sportsRow, feed: 'nba-games' },
      ],
      ['a games row without a title', { ...sportsRow, title: '' }],
      [
        'a games row whose ID is not kebab-case',
        { ...sportsRow, id: 'Sports' },
      ],
      [
        'a games row whose screen is not kebab-case',
        { ...sportsRow, screen: 'NFL' },
      ],
      ['a preview without a screen', { ...politics, screen: undefined }],
      [
        'a preview on a Feed key missing from feeds',
        { ...politics, feed: 'politics-iran' },
      ],
      ['a Trending without sources', { kind: 'trending', sources: [] }],
      [
        'a Trending whose sources are not an array',
        { kind: 'trending', sources: 'nfl-games' },
      ],
      [
        'a Trending with no source in feeds',
        { kind: 'trending', sources: ['nba-games'] },
      ],
    ])('drops and logs %s, and keeps the other sections', (_name, section) => {
      const home = parseHome({ sections: [section, ...KALSHI_SECTIONS] });

      expect(home).toEqual({ sections: KALSHI_SECTIONS });
      expect(Logger.log).toHaveBeenCalledWith(...droppedLog([section]));
    });

    it('ignores unknown section fields', () => {
      expect(
        parseHome({
          sections: [
            { ...sportsRow, badge: 'live' },
            { ...categories, x: 1 },
          ],
          footer: true,
        }),
      ).toEqual({ sections: [sportsRow, categories] });
      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('keeps a screen the catalog does not serve; the header resolves it', () => {
      const row = { ...sportsRow, screen: 'sports-basketball-nba' };

      expect(parseHome({ sections: [row] })).toEqual({ sections: [row] });
    });

    it('keeps a games row and a Trending without a screen', () => {
      const { screen: _row, ...row } = sportsRow;
      const { screen: _trending, ...bareTrending } = trending;

      expect(parseHome({ sections: [bareTrending, row] })).toEqual({
        sections: [bareTrending, row],
      });
    });

    it("drops and logs Trending's sources missing from feeds or repeated, and keeps the rest", () => {
      const home = parseHome({
        sections: [
          {
            ...trending,
            sources: [
              'nba-games',
              'nfl-games',
              'nfl-games',
              7,
              'college-football-games',
            ],
          },
        ],
      });

      expect(home).toEqual({ sections: [trending] });
      expect(Logger.log).toHaveBeenCalledWith(
        ...droppedLog(['nba-games', 'nfl-games', 7], 'Trending source'),
      );
    });

    it('drops a section that repeats an earlier ID, or a second Trending or Categories', () => {
      const repeatedRow = { ...sportsRow, title: 'More sports' };
      const repeatedPreview = { ...politics, id: 'sports' };
      const home = parseHome({
        sections: [
          ...KALSHI_SECTIONS,
          repeatedRow,
          repeatedPreview,
          trending,
          categories,
        ],
      });

      expect(home).toEqual({ sections: KALSHI_SECTIONS });
      expect(Logger.log).toHaveBeenCalledWith(
        ...droppedLog([repeatedRow, repeatedPreview, trending, categories]),
      );
    });

    it('keeps the first eight sections and drops the rest', () => {
      const rows = Array.from({ length: 10 }, (_, index) => ({
        ...sportsRow,
        id: `row-${index + 1}`,
      }));

      const home = parseHome({ sections: rows });

      expect(home?.sections).toEqual(rows.slice(0, 8));
      expect(Logger.log).toHaveBeenCalledWith(...droppedLog(rows.slice(8)));
    });

    describe('Feed reads', () => {
      const manyFeeds = Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `feed-${index + 1}`,
          `feed-id-${index + 1}`,
        ]),
      );
      const parseWithManyFeeds = (sections: unknown[]) =>
        parsePredictVenueCatalog(
          createCatalog({ feeds: manyFeeds, home: { sections } }),
          venueId,
        ).home;
      const row = (feed: string) => ({
        kind: 'games-row',
        id: feed,
        title: feed,
        feed,
      });

      it('drops a section that would take Home past eight Feed reads', () => {
        const sections = [
          {
            kind: 'trending',
            sources: [
              'feed-1',
              'feed-2',
              'feed-3',
              'feed-4',
              'feed-5',
              'feed-6',
              'feed-7',
            ],
          },
          row('feed-1'),
          row('feed-8'),
          row('feed-9'),
        ];

        const home = parseWithManyFeeds(sections);

        // A row on a Trending source costs no extra read.
        expect(home?.sections).toEqual(sections.slice(0, 3));
        expect(Logger.log).toHaveBeenCalledWith(...droppedLog([row('feed-9')]));
      });

      it('trims Trending to the sources that fit', () => {
        const sources = Array.from(
          { length: 10 },
          (_, index) => `feed-${index + 1}`,
        );

        const home = parseWithManyFeeds([
          row('feed-10'),
          { kind: 'trending', sources },
        ]);

        expect(home?.sections[1]).toEqual({
          kind: 'trending',
          sources: [
            'feed-1',
            'feed-2',
            'feed-3',
            'feed-4',
            'feed-5',
            'feed-6',
            'feed-7',
            'feed-10',
          ],
        });
        expect(Logger.log).toHaveBeenCalledWith(
          ...droppedLog(['feed-8', 'feed-9'], 'Trending source'),
        );
      });
    });
  });

  it('rejects a catalog for another Venue instead of using it', () => {
    expectInvalidCatalog(createCatalog({ venueId: 'polymarket' }));
  });
});
