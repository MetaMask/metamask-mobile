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

  it('drops unknown, duplicate, and Feed-less Categories, and logs them', () => {
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

    expect(result.categories).toEqual(['nfl-games']);
    expect(Logger.log).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      '[PredictNext] Dropped 3 Venue catalog Categories for kalshi',
      { dropped: ['curling-live', 'politics', 'nfl-games'] },
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

  it('drops unknown Feed keys', () => {
    const result = parsePredictVenueCatalog(
      createCatalog({
        feeds: { 'nfl-games': 'nfl-games-feed', 'curling-live': 'curling' },
      }),
      venueId,
    );

    expect(result.feeds).toEqual({ 'nfl-games': 'nfl-games-feed' });
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
    [
      'a known Feed key without a Feed ID',
      createCatalog({ feeds: { 'nfl-games': '' } }),
    ],
    [
      'a known Feed key with a non-string Feed ID',
      createCatalog({ feeds: { 'nfl-games': 7 } }),
    ],
  ])('rejects %s', (_name, value) => {
    expectInvalidCatalog(value);
  });

  it('rejects a catalog for another Venue instead of using it', () => {
    expectInvalidCatalog(createCatalog({ venueId: 'polymarket' }));
  });
});
