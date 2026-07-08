import {
  mergeChildMarketsIntoEvent,
  resolveWorldCupFeedEvents,
  shouldFetchWorldCupChildMarkets,
} from './sportsUtils';
import type { PolymarketApiEvent } from './types';

const createWorldCupEvent = (
  overrides: Partial<PolymarketApiEvent> = {},
): PolymarketApiEvent =>
  ({
    id: 'parent-event',
    slug: 'fifwc-fra-mar-2026-07-09',
    title: 'France vs Morocco',
    tags: [
      { id: 'games', label: 'Games', slug: 'games' },
      { id: 'world-cup', label: 'World Cup', slug: 'fifa-world-cup' },
    ],
    series: [
      {
        id: 'world-cup',
        slug: 'world-cup',
        title: 'World Cup',
        recurrence: 'none',
      },
    ],
    markets: [{ id: 'moneyline-market', sportsMarketType: 'moneyline' }],
    ...overrides,
  }) as PolymarketApiEvent;

describe('sportsUtils', () => {
  describe('shouldFetchWorldCupChildMarkets', () => {
    it('detects World Cup parent feed events that need child markets', () => {
      expect(
        shouldFetchWorldCupChildMarkets({
          event: createWorldCupEvent(),
          extendedSportsMarketsLeagues: ['fifwc'],
        }),
      ).toBe(true);
    });

    it('does not fetch when World Cup is not enabled', () => {
      expect(
        shouldFetchWorldCupChildMarkets({
          event: createWorldCupEvent(),
          extendedSportsMarketsLeagues: ['ucl'],
        }),
      ).toBe(false);
    });

    it('does not fetch for child events or events that already include team-to-advance', () => {
      expect(
        shouldFetchWorldCupChildMarkets({
          event: createWorldCupEvent({ parentEventId: 'parent-event' }),
          extendedSportsMarketsLeagues: ['fifwc'],
        }),
      ).toBe(false);
      expect(
        shouldFetchWorldCupChildMarkets({
          event: createWorldCupEvent({
            markets: [
              {
                id: 'team-to-advance-market',
                sportsMarketType: 'soccer_team_to_advance',
              },
            ],
          }),
          extendedSportsMarketsLeagues: ['fifwc'],
        }),
      ).toBe(false);
    });
  });

  describe('mergeChildMarketsIntoEvent', () => {
    it('merges child markets without duplicating existing markets', () => {
      const event = createWorldCupEvent({
        markets: [{ id: 'moneyline-market', sportsMarketType: 'moneyline' }],
      });

      expect(
        mergeChildMarketsIntoEvent(event, [
          { id: 'moneyline-market', sportsMarketType: 'moneyline' },
          {
            id: 'team-to-advance-market',
            sportsMarketType: 'soccer_team_to_advance',
          },
        ]).markets,
      ).toEqual([
        { id: 'moneyline-market', sportsMarketType: 'moneyline' },
        {
          id: 'team-to-advance-market',
          sportsMarketType: 'soccer_team_to_advance',
        },
      ]);
    });
  });

  describe('resolveWorldCupFeedEvents', () => {
    it('adds child markets to World Cup parent feed events', async () => {
      const parentEvent = createWorldCupEvent();
      const teamToAdvanceMarket = {
        id: 'team-to-advance-market',
        sportsMarketType: 'soccer_team_to_advance',
      };
      const fetchChildEvents = jest.fn().mockResolvedValue([
        createWorldCupEvent({ id: 'fetched-parent', markets: [] }),
        createWorldCupEvent({
          id: 'child-event',
          parentEventId: parentEvent.id,
          markets: [teamToAdvanceMarket],
        }),
      ]);

      await expect(
        resolveWorldCupFeedEvents([parentEvent], {
          extendedSportsMarketsLeagues: ['fifwc'],
          fetchChildEvents,
        }),
      ).resolves.toEqual([
        expect.objectContaining({
          id: parentEvent.id,
          markets: [parentEvent.markets[0], teamToAdvanceMarket],
        }),
      ]);
      expect(fetchChildEvents).toHaveBeenCalledWith({
        parentEventId: parentEvent.id,
      });
    });

    it('returns events unchanged when no event needs child markets', async () => {
      const events = [
        createWorldCupEvent({
          markets: [
            {
              id: 'team-to-advance-market',
              sportsMarketType: 'soccer_team_to_advance',
            },
          ],
        }),
      ];
      const fetchChildEvents = jest.fn();

      await expect(
        resolveWorldCupFeedEvents(events, {
          extendedSportsMarketsLeagues: ['fifwc'],
          fetchChildEvents,
        }),
      ).resolves.toBe(events);
      expect(fetchChildEvents).not.toHaveBeenCalled();
    });

    it('keeps the parent event when child fetch fails', async () => {
      const parentEvent = createWorldCupEvent();
      const fetchChildEvents = jest.fn().mockRejectedValue(new Error('boom'));

      await expect(
        resolveWorldCupFeedEvents([parentEvent], {
          extendedSportsMarketsLeagues: ['fifwc'],
          fetchChildEvents,
        }),
      ).resolves.toEqual([parentEvent]);
    });
  });
});
