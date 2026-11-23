import {
  makePredictNextEvent,
  makePredictNextGameEvent,
} from '../../../../../../../tests/component-view/fixtures/predictNext';
import type { PredictVenueCapabilities } from '../../../capabilities';
import type {
  PredictEvent,
  PredictFeedId,
  PredictGameStatus,
  PredictHomeSection,
} from '../../../types';
import {
  getHomeSectionTitle,
  isHomeReadConstrained,
  planHomeFeedReads,
  selectHomeSections,
  type HomeFeedReadEvents,
} from './homeSections';

const game = (id: string, status: PredictGameStatus = 'scheduled') =>
  makePredictNextGameEvent(id, `${id} away`, `${id} home`, 'NFL', { status });
const games = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => game(`${prefix}-${index + 1}`));
const ids = (events: readonly PredictEvent[]) => events.map(({ id }) => id);

/** Kalshi's Home, as its catalog serves it. */
const KALSHI_HOME: PredictHomeSection[] = [
  {
    kind: 'trending',
    sources: ['nfl-games', 'college-football-games'],
    screen: 'sports',
  },
  {
    kind: 'games-row',
    id: 'sports',
    title: 'Sports',
    feed: 'nfl-games',
    screen: 'sports-football-nfl',
  },
  { kind: 'categories' },
  {
    kind: 'feed-preview',
    id: 'politics',
    title: 'Politics',
    feed: 'politics-trump',
    screen: 'politics',
  },
];

const read = (
  feedKey: string,
  events: PredictEvent[] = [],
  state: Partial<HomeFeedReadEvents> = {},
): HomeFeedReadEvents => ({
  feedKey,
  events,
  isLoading: false,
  isError: false,
  ...state,
});
const homeReads = ({
  nfl = [],
  ncaa = [],
  politics = [],
}: {
  nfl?: PredictEvent[];
  ncaa?: PredictEvent[];
  politics?: PredictEvent[];
}) => [
  read('nfl-games', nfl),
  read('college-football-games', ncaa),
  read('politics-trump', politics),
];
const politics = [
  makePredictNextEvent('politics-1', 'Trump approval above 45%?'),
  makePredictNextEvent('politics-2', 'Congress passes the budget?'),
];

/** Kalshi's Home chosen from `reads`, as the old row helper returned it. */
const selectRows = (
  reads: HomeFeedReadEvents[],
  sections: PredictHomeSection[] = KALSHI_HOME,
) => {
  const home = selectHomeSections(sections, reads);
  const eventsOf = (kind: string) =>
    home.sections.flatMap((section) =>
      section.kind === kind && 'events' in section ? [section.events] : [],
    );
  return {
    home,
    trending: eventsOf('trending')[0] ?? [],
    sports: eventsOf('games-row')[0] ?? [],
    sections: eventsOf('feed-preview').map((events) => ({ events })),
  };
};

describe('selectHomeSections', () => {
  describe('Trending', () => {
    it('takes up to two Games per read, then fills to five in read order', () => {
      const rows = selectRows(
        homeReads({ nfl: games('nfl', 6), ncaa: games('ncaa', 4), politics }),
      );

      expect(ids(rows.trending)).toEqual([
        'nfl-1',
        'nfl-2',
        'nfl-3',
        'ncaa-1',
        'ncaa-2',
      ]);
    });

    it('shows live Games first, then read order', () => {
      const nfl = [game('nfl-1'), game('nfl-2'), game('nfl-3', 'in_progress')];
      const ncaa = [game('ncaa-1'), game('ncaa-2', 'in_progress')];

      const rows = selectRows(homeReads({ nfl, ncaa }));

      expect(ids(rows.trending)).toEqual([
        'nfl-3',
        'ncaa-2',
        'nfl-1',
        'nfl-2',
        'ncaa-1',
      ]);
    });

    it('picks a live Game over earlier scheduled Games of its read', () => {
      const nfl = [...games('nfl', 5), game('nfl-live', 'in_progress')];

      const rows = selectRows(homeReads({ nfl, ncaa: games('ncaa', 4) }));

      expect(ids(rows.trending)).toEqual([
        'nfl-live',
        'nfl-1',
        'nfl-2',
        'ncaa-1',
        'ncaa-2',
      ]);
      expect(ids(rows.sports)).toEqual(['nfl-3', 'nfl-4', 'nfl-5']);
    });

    it('lets one read fill the carousel when the others have no Games', () => {
      const rows = selectRows(homeReads({ nfl: games('nfl', 6), politics }));

      expect(ids(rows.trending)).toEqual([
        'nfl-1',
        'nfl-2',
        'nfl-3',
        'nfl-4',
        'nfl-5',
      ]);
    });

    it('skips Events without a Game', () => {
      const rows = selectRows(
        homeReads({
          nfl: [makePredictNextEvent('nfl-futures', 'Who wins the AFC?')],
          ncaa: [game('ncaa-1')],
          politics,
        }),
      );

      expect(ids(rows.trending)).toEqual(['ncaa-1']);
    });

    it('lists a Game two reads share once', () => {
      const shared = game('shared');

      const rows = selectRows(
        homeReads({
          nfl: [game('nfl-1'), shared],
          ncaa: [shared, game('ncaa-1')],
        }),
      );

      expect(ids(rows.trending)).toEqual(['nfl-1', 'shared', 'ncaa-1']);
    });
  });

  describe('Sports', () => {
    it('shows the NFL Games Trending does not, in read order', () => {
      const rows = selectRows(
        homeReads({ nfl: games('nfl', 6), ncaa: games('ncaa', 4), politics }),
      );

      expect(ids(rows.sports)).toEqual(['nfl-4', 'nfl-5', 'nfl-6']);
    });

    it('shows at most six Games', () => {
      const rows = selectRows(
        homeReads({ nfl: games('nfl', 12), ncaa: games('ncaa', 4) }),
      );

      expect(ids(rows.sports)).toEqual([
        'nfl-4',
        'nfl-5',
        'nfl-6',
        'nfl-7',
        'nfl-8',
        'nfl-9',
      ]);
    });

    it('skips NFL Events without a Game', () => {
      const rows = selectRows(
        homeReads({
          nfl: [
            ...games('nfl', 5),
            makePredictNextEvent('nfl-futures', 'Who wins the AFC?'),
            game('nfl-6'),
          ],
        }),
      );

      expect(ids(rows.sports)).toEqual(['nfl-6']);
    });

    it('is empty when Trending shows every NFL Game', () => {
      const rows = selectRows(
        homeReads({ nfl: games('nfl', 2), ncaa: games('ncaa', 2) }),
      );

      expect(rows.sports).toEqual([]);
    });
  });

  describe('sections', () => {
    it('gives a preview its own read and its Events', () => {
      const reads = homeReads({ nfl: games('nfl', 6), politics });

      const { home } = selectRows(reads);

      expect(home.sections[3]).toEqual({
        ...KALSHI_HOME[3],
        key: 'feed-preview-politics',
        events: politics,
        read: reads[2],
      });
    });

    it('drops an Event a row above already shows', () => {
      const shared = game('shared');

      const rows = selectRows(
        homeReads({ nfl: [shared], politics: [shared, ...politics] }),
      );

      expect(ids(rows.trending)).toEqual(['shared']);
      expect(ids(rows.sections[0].events)).toEqual([
        'politics-1',
        'politics-2',
      ]);
    });

    it('keeps a section Game in its section and out of Trending', () => {
      const politicsGame = game('politics-game');

      const rows = selectRows(
        homeReads({ politics: [politicsGame, ...politics] }),
      );

      expect(rows.trending).toEqual([]);
      expect(ids(rows.sections[0].events)).toEqual([
        'politics-game',
        'politics-1',
        'politics-2',
      ]);
    });
  });

  it('never lists an Event twice across the rows', () => {
    const nfl = games('nfl', 6);
    const rows = selectRows(
      homeReads({ nfl, ncaa: [nfl[0], ...games('ncaa', 3)], politics }),
    );

    const shown = ids([
      ...rows.trending,
      ...rows.sports,
      ...rows.sections.flatMap(({ events }) => events),
    ]);
    expect(new Set(shown).size).toBe(shown.length);
  });

  describe('catalog layout', () => {
    it('returns the sections in catalog order, keyed by kind and ID', () => {
      const { home } = selectRows(homeReads({ nfl: games('nfl', 6) }));

      expect(home.sections.map(({ key }) => key)).toEqual([
        'trending',
        'games-row-sports',
        'categories',
        'feed-preview-politics',
      ]);
    });

    it('follows a reordered catalog, and a row above Trending takes its Games first', () => {
      const [trending, sports, categories, preview] = KALSHI_HOME;

      const rows = selectRows(
        homeReads({ nfl: games('nfl', 6), ncaa: games('ncaa', 4) }),
        [preview, sports, categories, trending],
      );

      expect(rows.home.sections.map(({ kind }) => kind)).toEqual([
        'feed-preview',
        'games-row',
        'categories',
        'trending',
      ]);
      expect(ids(rows.sports)).toEqual(ids(games('nfl', 6)));
      expect(ids(rows.trending)).toEqual([
        'ncaa-1',
        'ncaa-2',
        'ncaa-3',
        'ncaa-4',
      ]);
    });

    it('fills a games row from its own Feed, whatever Trending reads', () => {
      const nba = games('nba', 3);
      const sections: PredictHomeSection[] = [
        KALSHI_HOME[0],
        {
          kind: 'games-row',
          id: 'basketball',
          title: 'NBA',
          feed: 'nba-games',
        },
      ];

      const rows = selectRows(
        [...homeReads({ nfl: games('nfl', 6) }), read('nba-games', nba)],
        sections,
      );

      expect(ids(rows.sports)).toEqual(['nba-1', 'nba-2', 'nba-3']);
    });

    it('shows several games rows, each on its own Feed', () => {
      const sections: PredictHomeSection[] = [
        { kind: 'games-row', id: 'nfl', title: 'NFL', feed: 'nfl-games' },
        {
          kind: 'games-row',
          id: 'ncaa',
          title: 'NCAAF',
          feed: 'college-football-games',
        },
      ];

      const { home } = selectRows(
        homeReads({ nfl: games('nfl', 2), ncaa: games('ncaa', 2) }),
        sections,
      );

      expect(
        home.sections.map((section) =>
          'events' in section ? ids(section.events) : [],
        ),
      ).toEqual([
        ['nfl-1', 'nfl-2'],
        ['ncaa-1', 'ncaa-2'],
      ]);
    });

    it('returns no sections for an empty layout', () => {
      expect(selectHomeSections([], homeReads({})).sections).toEqual([]);
    });
  });

  describe('loading', () => {
    it('holds Trending and the rows below it on skeletons until every Games read above settles', () => {
      const reads = [
        read('nfl-games', games('nfl', 6)),
        read('college-football-games', [], { isLoading: true }),
        read('politics-trump', politics),
      ];

      const { home, trending, sports, sections } = selectRows(reads);

      expect(trending).toEqual([]);
      expect(sports).toEqual([]);
      expect(
        home.sections.map((section) =>
          'isLoading' in section ? section.isLoading : undefined,
        ),
      ).toEqual([true, true, undefined, undefined]);
      // A preview waits for its own read only.
      expect(ids(sections[0].events)).toEqual(['politics-1', 'politics-2']);
    });

    it('never holds a games row for a preview read still loading', () => {
      const reads = [
        read('nfl-games', games('nfl', 6)),
        read('college-football-games', games('ncaa', 2)),
        read('politics-trump', [], { isLoading: true }),
      ];

      const { sports } = selectRows(reads);

      expect(ids(sports)).toEqual(['nfl-4', 'nfl-5', 'nfl-6']);
    });
  });

  describe('failed Games reads', () => {
    it('lists each Trending or games-row read that failed with no Events, once', () => {
      const failedNfl = read('nfl-games', [], { isError: true });
      const reads = [
        failedNfl,
        read('college-football-games', games('ncaa', 2)),
        read('politics-trump', [], { isError: true }),
      ];

      expect(selectRows(reads).home.failedGamesReads).toEqual([failedNfl]);
    });

    it('keeps a failed refetch over cached Events out', () => {
      const reads = [
        read('nfl-games', games('nfl', 2), { isError: true }),
        read('college-football-games', games('ncaa', 2)),
      ];

      expect(selectRows(reads).home.failedGamesReads).toEqual([]);
    });
  });
});

describe('planHomeFeedReads', () => {
  const capabilities = {
    status: 'ready',
    descriptor: {
      venueId: 'kalshi',
      displayName: 'Kalshi',
      actions: [],
      feeds: {
        'nfl-games': 'nfl-feed',
        'college-football-games': 'ncaa-feed',
        'politics-trump': 'trump-feed',
      },
      categories: [],
      searchSupported: false,
      screens: [],
    },
  } as unknown as PredictVenueCapabilities;

  it('reads six NFL, four NCAAF and two Politics Events for Kalshi', () => {
    expect(planHomeFeedReads(KALSHI_HOME, capabilities, false)).toEqual([
      { feedKey: 'nfl-games', feedId: 'nfl-feed' as PredictFeedId, limit: 6 },
      {
        feedKey: 'college-football-games',
        feedId: 'ncaa-feed' as PredictFeedId,
        limit: 4,
      },
      {
        feedKey: 'politics-trump',
        feedId: 'trump-feed' as PredictFeedId,
        limit: 2,
      },
    ]);
  });

  it('reads shorter lists on a constrained device', () => {
    expect(
      planHomeFeedReads(KALSHI_HOME, capabilities, true).map(
        ({ limit }) => limit,
      ),
    ).toEqual([4, 2, 1]);
  });

  it('reads a Feed two sections share once, in first-read order', () => {
    const sections: PredictHomeSection[] = [
      {
        kind: 'feed-preview',
        id: 'nfl',
        title: 'NFL',
        feed: 'nfl-games',
        screen: 'nfl',
      },
      KALSHI_HOME[0],
    ];

    expect(planHomeFeedReads(sections, capabilities, false)).toEqual([
      { feedKey: 'nfl-games', feedId: 'nfl-feed', limit: 4 },
      { feedKey: 'college-football-games', feedId: 'ncaa-feed', limit: 4 },
    ]);
  });

  it('reads nothing for Categories or while capabilities are not ready', () => {
    expect(
      planHomeFeedReads([{ kind: 'categories' }], capabilities, false),
    ).toEqual([]);
    expect(
      planHomeFeedReads(KALSHI_HOME, { status: 'loading' }, false).map(
        ({ feedId }) => feedId,
      ),
    ).toEqual([undefined, undefined, undefined]);
  });
});

describe('isHomeReadConstrained', () => {
  it.each([
    ['LOW', 'WIFI', true],
    ['HIGH', 'SLOW_CELLULAR', true],
    ['MID', 'FAST_CELLULAR', false],
    ['HIGH', 'NONE', false],
    [null, null, false],
  ] as const)(
    '%s hardware on %s network is constrained: %s',
    (hardware, network, expected) => {
      expect(isHomeReadConstrained(hardware, network)).toBe(expected);
    },
  );
});

describe('getHomeSectionTitle', () => {
  it('uses the app copy for a section ID it knows', () => {
    expect(getHomeSectionTitle('sports', 'Sport')).toBe('Sports');
    expect(getHomeSectionTitle('politics', 'Politik')).toBe('Politics');
  });

  it("uses the server's title for any other section", () => {
    expect(getHomeSectionTitle('basketball', 'NBA')).toBe('NBA');
  });
});
