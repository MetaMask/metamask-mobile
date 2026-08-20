import {
  getNegRiskMoneylineTeamLogo,
  getSportsMarketTeamLogo,
  hasNegRiskMoneylineGroupItem,
  resolveNegRiskMoneylineShortTitles,
} from './sportsUtils';
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

describe('sportsUtils', () => {
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
  });
});
