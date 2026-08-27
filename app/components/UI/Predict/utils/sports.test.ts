import {
  getBuyOutcomeImage,
  hasExplicitMoneylineDraw,
  isDrawCapableMarket,
  getMatchingSportTeam,
  getPrimaryMoneylineOutcomes,
  getPrimarySportsCardOutcomes,
  getSportTeamColorForLabel,
  getSportTeamDisplayOrder,
  getTeamOutcome,
  getTeamToAdvanceTokenLogo,
  getTokenImage,
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

const dota2Game: PredictMarketGame = {
  ...game,
  id: 'dota2-game-1',
  league: 'dota2',
  score: { away: 0, home: 0, raw: '000-000|0-0|Bo2' },
  homeTeam: {
    id: 'team-home-dota',
    name: 'Nigma',
    logo: 'https://example.com/nigma.png',
    abbreviation: 'NIGMA',
    color: 'black',
  },
  awayTeam: {
    id: 'team-away-dota',
    name: '1win',
    logo: 'https://example.com/1win.png',
    abbreviation: '1WIN',
    color: 'white',
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

describe('isDrawCapableMarket', () => {
  it('returns true for existing draw-capable leagues', () => {
    const result = isDrawCapableMarket({
      game,
      outcomes: [
        {
          id: 'moneyline',
          sportsMarketType: 'moneyline',
          tokens: [
            { id: 'home-token', title: 'Korea Republic' },
            { id: 'away-token', title: 'Czechia' },
          ],
        },
      ],
    });

    expect(result).toBe(true);
  });

  it('returns true when a combined moneyline includes a draw token', () => {
    const result = isDrawCapableMarket({
      game: dota2Game,
      outcomes: [
        {
          id: 'moneyline',
          sportsMarketType: 'moneyline',
          tokens: [
            { id: 'home-token', title: 'Nigma' },
            { id: 'draw-token', title: 'Draw' },
            { id: 'away-token', title: '1win' },
          ],
        },
      ],
    });

    expect(result).toBe(true);
  });

  it('returns true for unordered split neg-risk moneylines with an explicit draw', () => {
    const result = isDrawCapableMarket({
      game: dota2Game,
      outcomes: [
        {
          id: 'away-moneyline',
          sportsMarketType: 'moneyline',
          groupItemTitle: '1win',
          negRisk: true,
          tokens: [{ id: 'away-yes-token', title: 'Yes' }],
        },
        {
          id: 'draw-moneyline',
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Draw',
          negRisk: true,
          tokens: [{ id: 'draw-yes-token', title: 'Yes' }],
        },
        {
          id: 'home-moneyline',
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Nigma',
          negRisk: true,
          tokens: [{ id: 'home-yes-token', title: 'Yes' }],
        },
      ],
    });

    expect(result).toBe(true);
  });

  it('returns false for two-way esports moneylines', () => {
    const result = isDrawCapableMarket({
      game: dota2Game,
      outcomes: [
        {
          id: 'moneyline',
          sportsMarketType: 'moneyline',
          tokens: [
            { id: 'home-token', title: 'Nigma' },
            { id: 'away-token', title: '1win' },
          ],
        },
      ],
    });

    expect(result).toBe(false);
  });

  it('returns false for three neg-risk moneylines without an explicit draw', () => {
    const result = isDrawCapableMarket({
      game: dota2Game,
      outcomes: [
        {
          id: 'home-moneyline',
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Nigma',
          negRisk: true,
          tokens: [{ id: 'home-yes-token', title: 'Yes' }],
        },
        {
          id: 'away-moneyline',
          sportsMarketType: 'moneyline',
          groupItemTitle: '1win',
          negRisk: true,
          tokens: [{ id: 'away-yes-token', title: 'Yes' }],
        },
        {
          id: 'map-total-moneyline',
          sportsMarketType: 'moneyline',
          groupItemTitle: 'Map Total',
          negRisk: true,
          tokens: [{ id: 'map-total-yes-token', title: 'Yes' }],
        },
      ],
    });

    expect(result).toBe(false);
  });

  it('matches draw labels case-insensitively', () => {
    const result = hasExplicitMoneylineDraw([
      {
        id: 'home-moneyline',
        sportsMarketType: 'moneyline',
        groupItemTitle: 'Nigma',
        negRisk: true,
        tokens: [{ id: 'home-yes-token', title: 'Yes' }],
      },
      {
        id: 'draw-moneyline',
        sportsMarketType: 'moneyline',
        groupItemTitle: ' dRaW ',
        negRisk: true,
        tokens: [{ id: 'draw-yes-token', title: 'Yes' }],
      },
      {
        id: 'away-moneyline',
        sportsMarketType: 'moneyline',
        groupItemTitle: '1win',
        negRisk: true,
        tokens: [{ id: 'away-yes-token', title: 'Yes' }],
      },
    ]);

    expect(result).toBe(true);
  });

  it('ignores draw labels on non-moneyline outcomes', () => {
    const result = isDrawCapableMarket({
      game: dota2Game,
      outcomes: [
        {
          id: 'moneyline',
          sportsMarketType: 'moneyline',
          tokens: [
            { id: 'home-token', title: 'Nigma' },
            { id: 'away-token', title: '1win' },
          ],
        },
        {
          id: 'map-draw',
          sportsMarketType: 'map_handicap',
          groupItemTitle: 'Draw',
          tokens: [{ id: 'map-draw-token', title: 'Draw' }],
        },
      ],
    });

    expect(result).toBe(false);
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

  it('resolves unordered split neg-risk esports draws to distinct tokens', () => {
    const awayOutcome = {
      id: 'away-moneyline',
      sportsMarketType: 'moneyline',
      groupItemTitle: '1win',
      negRisk: true,
      tokens: [{ id: 'away-yes-token', title: 'Yes' }],
    };
    const drawOutcome = {
      id: 'draw-moneyline',
      sportsMarketType: 'moneyline',
      groupItemTitle: 'Draw',
      negRisk: true,
      tokens: [{ id: 'draw-yes-token', title: 'Yes' }],
    };
    const homeOutcome = {
      id: 'home-moneyline',
      sportsMarketType: 'moneyline',
      groupItemTitle: 'Nigma',
      negRisk: true,
      tokens: [{ id: 'home-yes-token', title: 'Yes' }],
    };

    const result = resolveSportCardButtons({
      outcomes: [awayOutcome, drawOutcome, homeOutcome],
      game: dota2Game,
      showDraw: true,
    });

    expect(result.home).toEqual({
      outcome: homeOutcome,
      token: homeOutcome.tokens[0],
    });
    expect(result.draw).toEqual({
      outcome: drawOutcome,
      token: drawOutcome.tokens[0],
    });
    expect(result.away).toEqual({
      outcome: awayOutcome,
      token: awayOutcome.tokens[0],
    });
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

describe('getTokenImage', () => {
  it('uses team logos for combined team-to-advance tokens', () => {
    expect(getTeamToAdvanceTokenLogo('Korea Republic', game)).toBe(
      'https://example.com/korea.png',
    );
    expect(getTeamToAdvanceTokenLogo('CZE', game)).toBe(
      'https://example.com/czechia.png',
    );
    expect(getTeamToAdvanceTokenLogo('Team to Advance', game)).toBeUndefined();
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
