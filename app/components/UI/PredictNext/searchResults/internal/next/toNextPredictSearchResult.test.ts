import { readPredictEventRef } from '../../../navigation/entry/eventRef';
import { makeKalshiEvent } from '../../../trending/trendingHooks.testUtils';
import type { PredictEvent, PredictMarketStatus } from '../../../types';
import { toNextPredictSearchResult } from './toNextPredictSearchResult';

const readEventIntent = (
  result: ReturnType<typeof toNextPredictSearchResult>,
) => {
  if (result.intent.type !== 'event') {
    throw new Error(`Expected an event intent, got ${result.intent.type}`);
  }
  const { eventRef, ...rest } = result.intent;
  return { ...rest, eventRef: readPredictEventRef(eventRef) };
};

describe('toNextPredictSearchResult', () => {
  it("maps an open Event to its title, 'Open', its image and an event intent on its own Venue", () => {
    const event: PredictEvent = {
      ...makeKalshiEvent('game-1', 'Packers at Steelers'),
      imageUrl: 'https://example.com/game.png' as PredictEvent['imageUrl'],
    };

    const result = toNextPredictSearchResult(event);

    expect(result).toEqual({
      id: 'game-1',
      title: 'Packers at Steelers',
      subtitle: 'Open',
      imageUrl: 'https://example.com/game.png',
      intent: expect.objectContaining({ type: 'event' }),
    });
    expect(readEventIntent(result)).toEqual({
      type: 'event',
      eventRef: { implementation: 'next', venue: 'kalshi', eventId: 'game-1' },
      titleSnapshot: 'Packers at Steelers',
      imageSnapshot: 'https://example.com/game.png',
    });
  });

  const withStatuses = (...statuses: PredictMarketStatus[]): PredictEvent => {
    const base = makeKalshiEvent('game-2');
    return {
      ...base,
      markets: statuses.map((status, index) => ({
        ...base.markets[0],
        id: `${base.markets[0].id}-${index}` as PredictEvent['markets'][number]['id'],
        status,
      })),
    };
  };

  it.each(['initialized', 'active', 'inactive'] as const)(
    "shows 'Open' for an Event with a %s Market, which search still lists",
    (status) => {
      expect(toNextPredictSearchResult(withStatuses(status)).subtitle).toBe(
        'Open',
      );
    },
  );

  it("shows 'Open' while any Market is not terminal", () => {
    expect(
      toNextPredictSearchResult(withStatuses('finalized', 'inactive')).subtitle,
    ).toBe('Open');
  });

  it.each([
    ['every Market is terminal', ['closed', 'determined', 'finalized']],
    ['the Event has no Markets', []],
  ] as const)("shows 'closed' when %s", (_, statuses) => {
    expect(toNextPredictSearchResult(withStatuses(...statuses)).subtitle).toBe(
      'closed',
    );
  });

  it('leaves the image out when the Event has none', () => {
    const result = toNextPredictSearchResult(makeKalshiEvent('game-3'));

    expect(result).not.toHaveProperty('imageUrl');
    expect(readEventIntent(result)).not.toHaveProperty('imageSnapshot');
  });
});
