import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictVenueId } from '../../types';
import { parsePredictVenueCatalog } from './venueCatalog';

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
  it('parses a valid catalog', () => {
    const result = parsePredictVenueCatalog(createCatalog(), venueId);

    expect(result).toEqual({
      venueId: 'kalshi',
      actions: ['buy', 'sell'],
      feeds: {
        'nfl-games': 'sports-football-nfl-games',
        'nfl-props': 'sports-football-nfl-win-totals',
      },
      searchSupported: true,
    });
  });

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
