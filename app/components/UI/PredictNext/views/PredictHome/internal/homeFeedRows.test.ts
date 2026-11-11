import {
  makePredictNextEvent,
  makePredictNextGameEvent,
} from '../../../../../../../tests/component-view/fixtures/predictNext';
import {
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
  POLITICS_FEED_SCREEN_ID,
  type FeedScreenId,
} from '../../../navigation/feedScreens';
import type { PredictEvent, PredictGameStatus } from '../../../types';
import { selectHomeFeedRows } from './homeFeedRows';

const game = (id: string, status: PredictGameStatus = 'scheduled') =>
  makePredictNextGameEvent(id, `${id} away`, `${id} home`, 'NFL', { status });
const games = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => game(`${prefix}-${index + 1}`));
const ids = (events: readonly PredictEvent[]) => events.map(({ id }) => id);

interface TestRead {
  sectionId: FeedScreenId;
  events: PredictEvent[];
  isError: boolean;
}

// Home's reads in display order; Politics is the first one shown as a section.
const SECTIONS_FROM = 2;
const homeReads = ({
  nfl = [],
  ncaa = [],
  politics = [],
}: {
  nfl?: PredictEvent[];
  ncaa?: PredictEvent[];
  politics?: PredictEvent[];
}): TestRead[] => [
  { sectionId: NFL_FEED_SCREEN_ID, events: nfl, isError: false },
  { sectionId: NCAA_FEED_SCREEN_ID, events: ncaa, isError: false },
  { sectionId: POLITICS_FEED_SCREEN_ID, events: politics, isError: false },
];
const politics = [
  makePredictNextEvent('politics-1', 'Trump approval above 45%?'),
  makePredictNextEvent('politics-2', 'Congress passes the budget?'),
];

describe('selectHomeFeedRows', () => {
  describe('Trending', () => {
    it('takes up to two Games per read, then fills to five in read order', () => {
      const rows = selectHomeFeedRows(
        homeReads({ nfl: games('nfl', 6), ncaa: games('ncaa', 4), politics }),
        SECTIONS_FROM,
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

      const rows = selectHomeFeedRows(homeReads({ nfl, ncaa }), SECTIONS_FROM);

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

      const rows = selectHomeFeedRows(
        homeReads({ nfl, ncaa: games('ncaa', 4) }),
        SECTIONS_FROM,
      );

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
      const rows = selectHomeFeedRows(
        homeReads({ nfl: games('nfl', 6), politics }),
        SECTIONS_FROM,
      );

      expect(ids(rows.trending)).toEqual([
        'nfl-1',
        'nfl-2',
        'nfl-3',
        'nfl-4',
        'nfl-5',
      ]);
    });

    it('skips Events without a Game', () => {
      const rows = selectHomeFeedRows(
        homeReads({
          nfl: [makePredictNextEvent('nfl-futures', 'Who wins the AFC?')],
          ncaa: [game('ncaa-1')],
          politics,
        }),
        SECTIONS_FROM,
      );

      expect(ids(rows.trending)).toEqual(['ncaa-1']);
    });

    it('lists a Game two reads share once', () => {
      const shared = game('shared');

      const rows = selectHomeFeedRows(
        homeReads({
          nfl: [game('nfl-1'), shared],
          ncaa: [shared, game('ncaa-1')],
        }),
        SECTIONS_FROM,
      );

      expect(ids(rows.trending)).toEqual(['nfl-1', 'shared', 'ncaa-1']);
    });
  });

  describe('Sports', () => {
    it('shows the NFL Games Trending does not, in read order', () => {
      const rows = selectHomeFeedRows(
        homeReads({ nfl: games('nfl', 6), ncaa: games('ncaa', 4), politics }),
        SECTIONS_FROM,
      );

      expect(ids(rows.sports)).toEqual(['nfl-4', 'nfl-5', 'nfl-6']);
    });

    it('shows at most six Games', () => {
      const rows = selectHomeFeedRows(
        homeReads({ nfl: games('nfl', 12), ncaa: games('ncaa', 4) }),
        SECTIONS_FROM,
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
      const rows = selectHomeFeedRows(
        homeReads({
          nfl: [
            ...games('nfl', 5),
            makePredictNextEvent('nfl-futures', 'Who wins the AFC?'),
            game('nfl-6'),
          ],
        }),
        SECTIONS_FROM,
      );

      expect(ids(rows.sports)).toEqual(['nfl-6']);
    });

    it('is empty when Trending shows every NFL Game', () => {
      const rows = selectHomeFeedRows(
        homeReads({ nfl: games('nfl', 2), ncaa: games('ncaa', 2) }),
        SECTIONS_FROM,
      );

      expect(rows.sports).toEqual([]);
    });
  });

  describe('sections', () => {
    it('keeps the reads from the first section on, with their Events and fields', () => {
      const reads = homeReads({ nfl: games('nfl', 6), politics });

      const rows = selectHomeFeedRows(reads, SECTIONS_FROM);

      expect(rows.sections).toEqual([reads[SECTIONS_FROM]]);
    });

    it('drops an Event a row above already shows', () => {
      const politicsGame = game('politics-game');

      const rows = selectHomeFeedRows(
        homeReads({ politics: [politicsGame, ...politics] }),
        SECTIONS_FROM,
      );

      expect(ids(rows.trending)).toEqual(['politics-game']);
      expect(ids(rows.sections[0].events)).toEqual([
        'politics-1',
        'politics-2',
      ]);
    });
  });

  it('never lists an Event twice across the rows', () => {
    const nfl = games('nfl', 6);
    const rows = selectHomeFeedRows(
      homeReads({ nfl, ncaa: [nfl[0], ...games('ncaa', 3)], politics }),
      SECTIONS_FROM,
    );

    const shown = ids([
      ...rows.trending,
      ...rows.sports,
      ...rows.sections.flatMap(({ events }) => events),
    ]);
    expect(new Set(shown).size).toBe(shown.length);
  });
});
