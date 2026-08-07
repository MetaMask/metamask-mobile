import { PredictError, PredictErrorCode } from '../errors';
import { parsePredictEvent, parsePredictEventSummary } from './index';

const venueId = 'kalshi';

const createOutcome = (side: 'yes' | 'no') => ({
  venueId,
  id: `market-1-${side}`,
  marketId: 'market-1',
  side,
  label: side === 'yes' ? 'Yes' : 'No',
});

const createMarket = (overrides = {}) => ({
  venueId,
  id: 'market-1',
  eventId: 'event-1',
  question: 'Will the team win?',
  outcomes: [createOutcome('yes'), createOutcome('no')],
  status: 'open' as const,
  ...overrides,
});

describe('Predict API canonical response parsers', () => {
  it('parses an event summary without venue-specific fields', () => {
    const input = {
      venueId,
      id: 'event-1',
      title: 'Game outcome',
      startsAt: '2026-02-13T12:00:00Z',
    };

    const result = parsePredictEventSummary(input);

    expect(result).toEqual(input);
  });

  it('parses an event containing a binary market', () => {
    const input = {
      venueId,
      id: 'event-1',
      title: 'Game outcome',
      markets: [createMarket()],
    };

    const result = parsePredictEvent(input);

    expect(result.markets[0].outcomes).toHaveLength(2);
    expect(result.markets[0].outcomes.map(({ side }) => side)).toEqual([
      'yes',
      'no',
    ]);
  });

  it('rejects a market with two outcomes on the same side', () => {
    const input = {
      venueId,
      id: 'event-1',
      title: 'Game outcome',
      markets: [
        createMarket({
          outcomes: [createOutcome('yes'), createOutcome('yes')],
        }),
      ],
    };

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response',
    );
  });

  it('rejects an event with a malformed timestamp', () => {
    const input = {
      venueId,
      id: 'event-1',
      title: 'Game outcome',
      startsAt: 'not-a-timestamp',
    };

    try {
      parsePredictEventSummary(input);
      throw new Error('Expected parser to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictError);
      expect((error as PredictError).code).toBe(PredictErrorCode.UNKNOWN);
    }
  });
});
