import { readPredictEventRef } from '../../../navigation/entry/eventRef';
import { makeKalshiEvent } from '../../../trending/trendingHooks.testUtils';
import type { PredictEvent } from '../../../types';
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

  it("shows 'closed' when no Market of the Event trades, and no image without one", () => {
    const open = makeKalshiEvent('game-2');
    const event: PredictEvent = {
      ...open,
      markets: open.markets.map((market) => ({ ...market, status: 'closed' })),
    };

    const result = toNextPredictSearchResult(event);

    expect(result.subtitle).toBe('closed');
    expect(result).not.toHaveProperty('imageUrl');
    expect(readEventIntent(result)).not.toHaveProperty('imageSnapshot');
  });
});
