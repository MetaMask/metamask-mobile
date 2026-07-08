import {
  getNegRiskMoneylineTeamLogo,
  getPrimarySportsCardOutcomes,
  getSportsMarketTeamLogo,
  getTeamToAdvanceTokenLogo,
  getTokenImage,
  hasNegRiskMoneylineGroupItem,
  mergeChildMarketsIntoEvent,
  resolveNegRiskMoneylineShortTitles,
  resolveWorldCupFeedEvents,
  shouldFetchWorldCupChildMarkets,
} from './sportsUtils';
import type { PolymarketApiEvent } from './types';
import type { PredictMarketGame } from '../../types';

const game: PredictMarketGame = {
  id: 'game-1',
  startTime: '2026-06-11T23:00:00Z',
  status: 'scheduled',
  league: 'fifwc',
  elapsed: null,
  period: null,
  score: null,
  homeTeam: {
    id: 'team-home',
    name: 'Korea Republic',
    logo: 'https://example.com/korea.png',
    abbreviation: 'KOR',
    color: 'red',
    alias: 'South Korea',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Czechia',
    logo: 'https://example.com/czechia.png',
    abbreviation: 'CZE',
    color: 'blue',
  },
};

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

  describe('getPrimarySportsCardOutcomes', () => {
    it('prefers team-to-advance outcomes for World Cup games', () => {
      const moneylineOutcome = {
        id: 'moneyline',
        sportsMarketType: 'moneyline',
      };
      const teamToAdvanceOutcome = {
        id: 'team-to-advance',
        sportsMarketType: 'soccer_team_to_advance',
      };

      const result = getPrimarySportsCardOutcomes(
        [moneylineOutcome, teamToAdvanceOutcome],
        'fifwc',
      );

      expect(result).toEqual([teamToAdvanceOutcome]);
    });

    it('falls back to moneyline outcomes for World Cup games without team-to-advance markets', () => {
      const moneylineOutcome = {
        id: 'moneyline',
        sportsMarketType: 'moneyline',
      };
      const spreadOutcome = { id: 'spread', sportsMarketType: 'spreads' };

      const result = getPrimarySportsCardOutcomes(
        [spreadOutcome, moneylineOutcome],
        'fifwc',
      );

      expect(result).toEqual([moneylineOutcome]);
    });

    it('keeps moneyline as primary for non-World-Cup games', () => {
      const moneylineOutcome = {
        id: 'moneyline',
        sportsMarketType: 'moneyline',
      };
      const teamToAdvanceOutcome = {
        id: 'team-to-advance',
        sportsMarketType: 'soccer_team_to_advance',
      };

      const result = getPrimarySportsCardOutcomes(
        [teamToAdvanceOutcome, moneylineOutcome],
        'ucl',
      );

      expect(result).toEqual([moneylineOutcome]);
    });
  });

  describe('provider sports market mapping', () => {
    it('detects neg-risk moneyline markets with group item titles', () => {
      expect(
        hasNegRiskMoneylineGroupItem({
          negRisk: true,
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Korea Republic',
        }),
      ).toBe(true);
      expect(
        hasNegRiskMoneylineGroupItem({
          negRisk: true,
          sportsMarketType: 'spreads',
          groupItemTitle: 'Korea Republic',
        }),
      ).toBe(false);
    });

    it('resolves neg-risk moneyline short titles for team and draw outcomes', () => {
      expect(
        resolveNegRiskMoneylineShortTitles(
          {
            negRisk: true,
            sportsMarketType: 'moneyline',
            groupItemTitle: 'Korea Republic',
          },
          game,
        ),
      ).toEqual({ yesShort: 'KOR', noShort: 'CZE' });
      expect(
        resolveNegRiskMoneylineShortTitles(
          {
            negRisk: true,
            sportsMarketType: 'moneyline',
            groupItemTitle: 'Draw',
          },
          game,
        ),
      ).toEqual({ yesShort: 'Draw' });
    });

    it('uses team logos only for neg-risk moneyline team outcomes', () => {
      expect(
        getNegRiskMoneylineTeamLogo(
          {
            negRisk: true,
            sportsMarketType: 'moneyline',
            groupItemTitle: 'Korea Republic',
          },
          game,
        ),
      ).toBe('https://example.com/korea.png');
      expect(
        getNegRiskMoneylineTeamLogo(
          {
            negRisk: true,
            sportsMarketType: 'moneyline',
            groupItemTitle: 'Draw',
          },
          game,
        ),
      ).toBeUndefined();
    });

    it('uses team logos for team-to-advance group item markets', () => {
      expect(
        getSportsMarketTeamLogo(
          {
            sportsMarketType: 'soccer_team_to_advance',
            groupItemTitle: 'Czechia',
          },
          game,
        ),
      ).toBe('https://example.com/czechia.png');
      expect(
        getSportsMarketTeamLogo(
          {
            sportsMarketType: 'soccer_team_to_advance',
            groupItemTitle: 'Team to Advance',
          },
          game,
        ),
      ).toBeUndefined();
    });

    it('uses team logos for combined team-to-advance tokens', () => {
      expect(getTeamToAdvanceTokenLogo('Korea Republic', game)).toBe(
        'https://example.com/korea.png',
      );
      expect(getTeamToAdvanceTokenLogo('CZE', game)).toBe(
        'https://example.com/czechia.png',
      );
      expect(
        getTeamToAdvanceTokenLogo('Team to Advance', game),
      ).toBeUndefined();
    });

    it('resolves token images based on sports market type', () => {
      expect(
        getTokenImage({
          sportsMarketType: 'soccer_team_to_advance',
          tokenTitle: 'Korea Republic',
          game,
        }),
      ).toBe('https://example.com/korea.png');
      expect(
        getTokenImage({
          sportsMarketType: 'moneyline',
          tokenTitle: 'Korea Republic',
          game,
        }),
      ).toBeUndefined();
    });
  });
});
