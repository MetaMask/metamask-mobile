import {
  getBuyOutcomeImage,
  getMatchingSportTeam,
  getPrimaryMoneylineOutcomes,
  getSportTeamColorForLabel,
  getSportTeamDisplayOrder,
  getTeamOutcome,
  outcomeMatchesTeam,
  resolveSportCardButtons,
  sportTeamMatchesLabel,
} from './sports';
import type { PredictMarketGame, PredictOutcome } from '../types';

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

describe('getPrimaryMoneylineOutcomes', () => {
  it('keeps only main moneyline outcomes when extended sports markets are present', () => {
    const moneylineOutcome = { id: 'moneyline', sportsMarketType: 'moneyline' };
    const spreadOutcome = { id: 'spread', sportsMarketType: 'spreads' };
    const halftimeOutcome = {
      id: 'halftime',
      sportsMarketType: 'soccer_halftime_result',
    };

    const result = getPrimaryMoneylineOutcomes([
      spreadOutcome,
      moneylineOutcome,
      halftimeOutcome,
    ]);

    expect(result).toEqual([moneylineOutcome]);
  });

  it('falls back to all outcomes when no main moneyline type is present', () => {
    const outcomes = [
      { id: 'legacy-away', sportsMarketType: undefined },
      { id: 'legacy-draw', sportsMarketType: undefined },
      { id: 'legacy-home', sportsMarketType: undefined },
    ];

    expect(getPrimaryMoneylineOutcomes(outcomes)).toBe(outcomes);
  });
});

describe('resolveSportCardButtons', () => {
  it('resolves combined World Cup team-to-advance tokens from one outcome', () => {
    const moneylineOutcome = {
      id: 'moneyline',
      sportsMarketType: 'moneyline',
      tokens: [
        { id: 'home-token', title: 'Korea Republic', price: 0.6 },
        { id: 'draw-token', title: 'Draw', price: 0.2 },
        { id: 'away-token', title: 'Czechia', price: 0.4 },
      ],
    };
    const teamToAdvanceOutcome = {
      id: 'team-to-advance',
      sportsMarketType: 'soccer_team_to_advance',
      groupItemTitle: 'Team to Advance',
      tokens: [
        { id: 'home-advance-token', title: 'Korea Republic', price: 0.78 },
        { id: 'away-advance-token', title: 'Czechia', price: 0.22 },
      ],
    };

    const result = resolveSportCardButtons({
      outcomes: [moneylineOutcome, teamToAdvanceOutcome],
      game,
      showDraw: true,
    });

    expect(result).toEqual({
      home: {
        outcome: teamToAdvanceOutcome,
        token: teamToAdvanceOutcome.tokens[0],
      },
      away: {
        outcome: teamToAdvanceOutcome,
        token: teamToAdvanceOutcome.tokens[1],
      },
      draw: undefined,
      isTeamToAdvance: true,
      remainingOptions: 0,
    });
  });

  it('falls back to moneyline when World Cup has no team-to-advance outcome', () => {
    const moneylineOutcome = {
      id: 'moneyline',
      sportsMarketType: 'moneyline',
      tokens: [
        { id: 'home-token', title: 'KOR', price: 0.6 },
        { id: 'draw-token', title: 'Draw', price: 0.2 },
        { id: 'away-token', title: 'CZE', price: 0.4 },
      ],
    };
    const spreadOutcome = {
      id: 'spread',
      sportsMarketType: 'spreads',
      tokens: [
        { id: 'spread-token', title: 'Korea Republic -1.5', price: 0.5 },
      ],
    };

    const result = resolveSportCardButtons({
      outcomes: [spreadOutcome, moneylineOutcome],
      game,
      showDraw: true,
    });

    expect(result.home?.token.id).toBe('home-token');
    expect(result.draw?.token.id).toBe('draw-token');
    expect(result.away?.token.id).toBe('away-token');
    expect(result.isTeamToAdvance).toBe(false);
  });

  it('keeps split team-to-advance support without assuming token order', () => {
    const homeAdvanceOutcome = {
      id: 'home-advance',
      sportsMarketType: 'soccer_team_to_advance',
      groupItemTitle: 'Korea Republic',
      tokens: [
        { id: 'home-no-token', title: 'No', price: 0.2 },
        { id: 'home-advance-token', title: 'Korea Republic', price: 0.8 },
      ],
    };
    const awayAdvanceOutcome = {
      id: 'away-advance',
      sportsMarketType: 'soccer_team_to_advance',
      groupItemTitle: 'Czechia',
      tokens: [
        { id: 'away-no-token', title: 'No', price: 0.7 },
        { id: 'away-advance-token', title: 'Czechia', price: 0.3 },
      ],
    };

    const result = resolveSportCardButtons({
      outcomes: [homeAdvanceOutcome, awayAdvanceOutcome],
      game,
      showDraw: true,
    });

    expect(result.home?.token.id).toBe('home-advance-token');
    expect(result.away?.token.id).toBe('away-advance-token');
  });
});

describe('sports team matching', () => {
  it('matches sport teams by name, alias, or abbreviation', () => {
    expect(getMatchingSportTeam('south korea', game)).toBe(game.homeTeam);
    expect(getMatchingSportTeam('CZE', game)).toBe(game.awayTeam);
  });

  it('matches sport team labels by name, alias, or abbreviation', () => {
    expect(sportTeamMatchesLabel('Korea Republic', game.homeTeam)).toBe(true);
    expect(sportTeamMatchesLabel('south korea', game.homeTeam)).toBe(true);
    expect(sportTeamMatchesLabel('KOR', game.homeTeam)).toBe(true);
    expect(sportTeamMatchesLabel('CZE', game.homeTeam)).toBe(false);
  });

  it('matches outcomes to teams by group item title or first token title', () => {
    expect(
      outcomeMatchesTeam(
        {
          groupItemTitle: 'South Korea',
          tokens: [{ title: 'Yes' }],
        },
        game.homeTeam,
      ),
    ).toBe(true);
    expect(
      outcomeMatchesTeam(
        {
          tokens: [{ title: 'CZE' }],
        },
        game.awayTeam,
      ),
    ).toBe(true);
  });

  it('gets team outcomes with non-excluded fallback behavior', () => {
    const homeOutcome = {
      id: 'home',
      groupItemTitle: 'South Korea',
      tokens: [{ title: 'Yes' }],
    };
    const awayOutcome = {
      id: 'away',
      groupItemTitle: 'Czechia',
      tokens: [{ title: 'Yes' }],
    };
    const fallbackOutcome = {
      id: 'fallback',
      groupItemTitle: 'Fallback',
      tokens: [{ title: 'Yes' }],
    };

    expect(getTeamOutcome([homeOutcome, awayOutcome], game.awayTeam, 0)).toBe(
      awayOutcome,
    );
    expect(
      getTeamOutcome(
        [homeOutcome, awayOutcome, fallbackOutcome],
        game.awayTeam,
        2,
        awayOutcome,
      ),
    ).toBe(homeOutcome);
  });

  it('resolves team display order and colors from labels', () => {
    expect(getSportTeamDisplayOrder('KOR', game)).toBe(0);
    expect(getSportTeamDisplayOrder('CZE', game)).toBe(2);
    expect(getSportTeamDisplayOrder('Draw', game)).toBe(1);
    expect(getSportTeamColorForLabel('KOR', game)).toBe('red');
    expect(getSportTeamColorForLabel('CZE', game)).toBe('blue');
  });
});

describe('getBuyOutcomeImage', () => {
  it('uses token images only for World Cup team-to-advance buy headers', () => {
    const teamToAdvanceOutcome = {
      image: 'https://example.com/outcome.png',
      sportsMarketType: 'soccer_team_to_advance',
    } as PredictOutcome;
    const moneylineOutcome = {
      image: 'https://example.com/moneyline.png',
      sportsMarketType: 'moneyline',
    } as PredictOutcome;
    const outcomeToken = {
      id: 'token-1',
      title: 'Korea Republic',
      image: 'https://example.com/token.png',
      price: 0.5,
    };

    expect(
      getBuyOutcomeImage({
        outcome: teamToAdvanceOutcome,
        outcomeToken,
        game,
      }),
    ).toBe('https://example.com/token.png');
    expect(
      getBuyOutcomeImage({
        outcome: teamToAdvanceOutcome,
        outcomeToken: { ...outcomeToken, image: undefined },
        game,
      }),
    ).toBe('https://example.com/korea.png');
    expect(
      getBuyOutcomeImage({
        outcome: teamToAdvanceOutcome,
        outcomeToken,
        game: { ...game, league: 'ucl' },
      }),
    ).toBe('https://example.com/outcome.png');
    expect(
      getBuyOutcomeImage({
        outcome: moneylineOutcome,
        outcomeToken,
        game,
      }),
    ).toBe('https://example.com/moneyline.png');
  });
});
