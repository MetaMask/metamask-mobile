import composedNflGame from '../../../contracts/v1/fixtures/composed-nfl-game.json';
import { parsePredictEvent } from '../../../contracts/v1/marketData';
import { PREDICT_MARKET_TYPES } from '../../../constants';
import type {
  PredictEntityId,
  PredictMarket,
  PredictMarketGroup,
  PredictMarketLayout,
} from '../../../types';
import {
  createMarketLayoutProjection,
  type MarketLayoutCard,
  type MarketLayoutProjection,
} from './createMarketLayoutProjection';

const composedGame = parsePredictEvent(composedNflGame);

const layoutOf = (
  section: string,
  sectionOrder: number,
  subgroup?: [string, number],
): PredictMarketLayout => ({
  tab: { key: 'game_lines', order: 0 },
  section: { key: section, order: sectionOrder },
  ...(subgroup === undefined
    ? {}
    : { subgroup: { key: subgroup[0], order: subgroup[1] } }),
});

const FULL_GAME: [string, number] = ['full_game', 0];
const FIRST_HALF: [string, number] = ['first_half', 1];

const createMarket = (
  id: string,
  {
    group,
    layout,
    volume,
  }: {
    group?: PredictMarketGroup;
    layout?: PredictMarketLayout;
    volume?: string;
  } = {},
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  group,
  layout,
  volume,
  outcomes: [
    { id: `${id}-yes` as PredictEntityId, side: 'yes', label: 'Yes' },
    { id: `${id}-no` as PredictEntityId, side: 'no', label: 'No' },
  ],
});

const choice = (key: string, displayOrder?: number): PredictMarketGroup => ({
  key,
  groupType: 'choice',
  displayOrder,
});

const line = (
  key: string,
  marketType: string,
  value: number,
  displayOrder?: number,
): PredictMarketGroup => ({
  key,
  groupType: 'marketSelector',
  marketType,
  option: { type: 'number', value },
  displayOrder,
});

const describeCard = (card: MarketLayoutCard) =>
  card.type === 'standard'
    ? { type: card.type, key: card.key, markets: [card.market.id] }
    : {
        type: card.type,
        key: card.key,
        ...(card.type === 'marketSelector'
          ? { marketType: card.marketType }
          : {}),
        markets: card.markets.map(({ id }) => id),
      };

/** The projection as keys and Market IDs, so trees read at a glance. */
const describeProjection = ({
  tabs,
  remainingMarkets,
}: MarketLayoutProjection) => ({
  tabs: tabs.map((tab) => ({
    key: tab.key,
    sections: tab.sections.map((section) => ({
      key: section.key,
      volume: section.volume,
      periods: section.periods.map((period) => ({
        key: period.key,
        cards: period.cards.map(describeCard),
      })),
    })),
  })),
  remainingMarkets: remainingMarkets.map(({ id }) => id),
});

const sectionsOf = (markets: readonly PredictMarket[]) =>
  describeProjection(createMarketLayoutProjection(markets)).tabs[0]?.sections;

describe('createMarketLayoutProjection', () => {
  it('projects the composed NFL game into sections, periods and cards', () => {
    expect(
      describeProjection(createMarketLayoutProjection(composedGame.markets)),
    ).toEqual({
      tabs: [
        {
          key: 'game_lines',
          sections: [
            {
              key: 'moneyline',
              volume: undefined,
              periods: [
                {
                  key: 'full_game',
                  cards: [
                    {
                      type: 'choice',
                      key: 'KXNFLGAME-26NOV02CHISEA:moneyline',
                      markets: [
                        'KXNFLGAME-26NOV02CHISEA-CHI',
                        'KXNFLGAME-26NOV02CHISEA-SEA',
                      ],
                    },
                  ],
                },
                {
                  key: 'first_half',
                  cards: [
                    {
                      type: 'choice',
                      key: 'KXNFL1H-26NOV02CHISEA:moneyline',
                      markets: [
                        'KXNFL1H-26NOV02CHISEA-CHI',
                        'KXNFL1H-26NOV02CHISEA-TIE',
                        'KXNFL1H-26NOV02CHISEA-SEA',
                      ],
                    },
                  ],
                },
              ],
            },
            {
              key: 'spread',
              volume: undefined,
              periods: [
                {
                  key: 'full_game',
                  cards: [
                    {
                      type: 'marketSelector',
                      key: 'KXNFLSPREAD-26NOV02CHISEA:spread',
                      marketType: PREDICT_MARKET_TYPES.SPREAD,
                      markets: ['KXNFLSPREAD-26NOV02CHISEA-SEA3'],
                    },
                  ],
                },
                {
                  key: 'first_half',
                  cards: [
                    {
                      type: 'marketSelector',
                      key: 'KXNFL1HSPREAD-26NOV02CHISEA:spread',
                      marketType: PREDICT_MARKET_TYPES.SPREAD,
                      markets: ['KXNFL1HSPREAD-26NOV02CHISEA-SEA1'],
                    },
                  ],
                },
              ],
            },
            {
              key: 'total_points',
              volume: undefined,
              periods: [
                {
                  key: 'full_game',
                  cards: [
                    {
                      type: 'marketSelector',
                      key: 'KXNFLTOTAL-26NOV02CHISEA:total',
                      marketType: PREDICT_MARKET_TYPES.TOTAL,
                      markets: ['KXNFLTOTAL-26NOV02CHISEA-44'],
                    },
                  ],
                },
                {
                  key: 'first_half',
                  cards: [
                    {
                      type: 'marketSelector',
                      key: 'KXNFL1HTOTAL-26NOV02CHISEA:total',
                      marketType: PREDICT_MARKET_TYPES.TOTAL,
                      markets: ['KXNFL1HTOTAL-26NOV02CHISEA-21'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      remainingMarkets: [],
    });
  });

  it('lists only the periods a section has', () => {
    const withoutFirstHalfSpread = composedGame.markets.filter(
      ({ id }) => id !== 'KXNFL1HSPREAD-26NOV02CHISEA-SEA1',
    );

    const sections = sectionsOf(withoutFirstHalfSpread);

    expect(
      sections?.map(({ key, periods }) => [key, periods.map((p) => p.key)]),
    ).toEqual([
      ['moneyline', ['full_game', 'first_half']],
      ['spread', ['full_game']],
      ['total_points', ['full_game', 'first_half']],
    ]);
  });

  it('projects team totals as one line picker per Team, in response order', () => {
    const teamTotal = (
      id: string,
      team: string,
      value: number,
      order: number,
    ) =>
      createMarket(id, {
        group: line(`game:team_total:${team}`, 'team_total', value, order),
        layout: layoutOf('team_total', 3, FULL_GAME),
      });
    const markets = [
      teamTotal('chi-24', 'CHI', 24.5, 1),
      teamTotal('chi-20', 'CHI', 20.5, 0),
      teamTotal('sea-21', 'SEA', 21.5, 0),
    ];

    expect(sectionsOf(markets)).toEqual([
      {
        key: 'team_total',
        volume: undefined,
        periods: [
          {
            key: 'full_game',
            cards: [
              {
                type: 'marketSelector',
                key: 'game:team_total:CHI',
                marketType: 'team_total',
                markets: ['chi-20', 'chi-24'],
              },
              {
                type: 'marketSelector',
                key: 'game:team_total:SEA',
                marketType: 'team_total',
                markets: ['sea-21'],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps several spread Markets on one line, one per Team', () => {
    const layout = layoutOf('spread', 1, FULL_GAME);
    const markets = [
      createMarket('sea-3', {
        group: line('spread', 'spread', 3.5, 0),
        layout,
      }),
      createMarket('chi-3', {
        group: line('spread', 'spread', 3.5, 1),
        layout,
      }),
    ];

    expect(sectionsOf(markets)?.[0].periods[0].cards).toEqual([
      {
        type: 'marketSelector',
        key: 'spread',
        marketType: 'spread',
        markets: ['sea-3', 'chi-3'],
      },
    ]);
  });

  it('shows a Market without a group as a standard card', () => {
    expect(
      sectionsOf([
        createMarket('single', { layout: layoutOf('props', 4, FULL_GAME) }),
      ])?.[0].periods[0].cards,
    ).toEqual([
      { type: 'standard', key: 'market:single', markets: ['single'] },
    ]);
  });

  it('shows a choice group with one option as a choice card', () => {
    expect(
      sectionsOf([
        createMarket('single', {
          group: choice('lonely'),
          layout: layoutOf('props', 4, FULL_GAME),
        }),
      ])?.[0].periods[0].cards,
    ).toEqual([{ type: 'choice', key: 'lonely', markets: ['single'] }]);
  });

  it.each([
    [
      'duplicate total lines',
      [line('totals', 'total', 44.5, 0), line('totals', 'total', 44.5, 1)],
    ],
    [
      'mixed market types',
      [line('totals', 'total', 44.5, 0), line('totals', 'spread', 3.5, 1)],
    ],
    [
      'mixed group types',
      [choice('totals', 0), line('totals', 'total', 44.5, 1)],
    ],
    [
      'a line without a numeric option',
      [
        { key: 'totals', groupType: 'marketSelector', marketType: 'total' },
        line('totals', 'total', 44.5, 1),
      ],
    ],
  ])('falls back to standard cards in place for %s', (_, groups) => {
    const layout = layoutOf('total_points', 2, FULL_GAME);
    const markets = [
      createMarket('first', { group: groups[0], layout }),
      createMarket('between', { layout }),
      createMarket('second', { group: groups[1], layout }),
    ];

    expect(sectionsOf(markets)?.[0].periods[0].cards).toEqual([
      { type: 'standard', key: 'market:first', markets: ['first'] },
      { type: 'standard', key: 'market:between', markets: ['between'] },
      { type: 'standard', key: 'market:second', markets: ['second'] },
    ]);
  });

  it('shows a group of an unknown group type as standard cards', () => {
    const layout = layoutOf('props', 4, FULL_GAME);
    const ladder = (displayOrder: number): PredictMarketGroup => ({
      key: 'ladder',
      groupType: 'ladder',
      displayOrder,
    });
    const markets = [
      createMarket('rung-1', { group: ladder(0), layout }),
      createMarket('rung-2', { group: ladder(1), layout }),
    ];

    expect(sectionsOf(markets)?.[0].periods[0].cards).toEqual([
      { type: 'standard', key: 'market:rung-1', markets: ['rung-1'] },
      { type: 'standard', key: 'market:rung-2', markets: ['rung-2'] },
    ]);
  });

  it('keeps a line picker of an unknown market type, for the caller to render', () => {
    const layout = layoutOf('player_points', 4, FULL_GAME);
    const markets = [
      createMarket('points-25', {
        group: line('player-a', 'player_points', 25, 0),
        layout,
      }),
      createMarket('points-30', {
        group: line('player-a', 'player_points', 30, 1),
        layout,
      }),
    ];

    expect(sectionsOf(markets)?.[0].periods[0].cards).toEqual([
      {
        type: 'marketSelector',
        key: 'player-a',
        marketType: 'player_points',
        markets: ['points-25', 'points-30'],
      },
    ]);
  });

  it('keeps a group whole when one member has no layout', () => {
    const firstHalfMoneyline = composedGame.markets.filter(
      (market) =>
        market.layout?.section.key === 'moneyline' &&
        market.layout.subgroup?.key === 'first_half',
    );
    const [chicago, tie, seattle] = firstHalfMoneyline;
    const markets = [chicago, { ...tie, layout: undefined }, seattle];

    const projection = describeProjection(
      createMarketLayoutProjection(markets),
    );

    expect(projection.remainingMarkets).toEqual([]);
    expect(projection.tabs[0].sections[0].periods).toEqual([
      {
        key: 'first_half',
        cards: [
          {
            type: 'choice',
            key: chicago.group?.key,
            markets: [chicago.id, tie.id, seattle.id],
          },
        ],
      },
    ]);
  });

  it('returns Markets without layout in response order and leaves them out of tabs', () => {
    const markets = [
      createMarket('flat-1'),
      composedGame.markets[0],
      createMarket('flat-2'),
      composedGame.markets[1],
    ];

    const projection = describeProjection(
      createMarketLayoutProjection(markets),
    );

    expect(projection.remainingMarkets).toEqual(['flat-1', 'flat-2']);
    expect(projection.tabs[0].sections[0].periods[0].cards).toEqual([
      expect.objectContaining({
        markets: [composedGame.markets[0].id, composedGame.markets[1].id],
      }),
    ]);
  });

  it('returns no tabs when no Market has layout', () => {
    const markets = [createMarket('flat')];

    expect(createMarketLayoutProjection(markets)).toEqual({
      tabs: [],
      remainingMarkets: markets,
    });
  });

  it('orders tabs, sections and periods by order, then first appearance', () => {
    const at = (
      id: string,
      tab: [string, number],
      section: [string, number],
      subgroup?: [string, number],
    ) =>
      createMarket(id, {
        layout: {
          tab: { key: tab[0], order: tab[1] },
          section: { key: section[0], order: section[1] },
          ...(subgroup === undefined
            ? {}
            : { subgroup: { key: subgroup[0], order: subgroup[1] } }),
        },
      });
    const markets = [
      at('props', ['player_props', 1], ['passing', 0]),
      at('total-h1', ['game_lines', 0], ['total', 2], FIRST_HALF),
      at('total-q1', ['game_lines', 0], ['total', 2], ['q1', 1]),
      at('total-full', ['game_lines', 0], ['total', 2], FULL_GAME),
      at('total-any', ['game_lines', 0], ['total', 2]),
      at('spread', ['game_lines', 0], ['spread', 1], FULL_GAME),
      at('moneyline', ['game_lines', 0], ['moneyline', 0], FULL_GAME),
    ];

    const { tabs } = describeProjection(createMarketLayoutProjection(markets));

    expect(
      tabs.map((tab) => [
        tab.key,
        tab.sections.map((section) => [
          section.key,
          section.periods.map((period) => period.key),
        ]),
      ]),
    ).toEqual([
      [
        'game_lines',
        [
          ['moneyline', ['full_game']],
          ['spread', ['full_game']],
          ['total', [undefined, 'full_game', 'first_half', 'q1']],
        ],
      ],
      ['player_props', [['passing', [undefined]]]],
    ]);
  });

  it('keeps the first order seen when one key arrives with different orders', () => {
    const markets = [
      createMarket('spread', { layout: layoutOf('spread', 1, FULL_GAME) }),
      createMarket('total', { layout: layoutOf('total_points', 2, FULL_GAME) }),
      createMarket('late-spread', {
        layout: layoutOf('spread', 3, FULL_GAME),
      }),
    ];

    expect(sectionsOf(markets)?.map(({ key }) => key)).toEqual([
      'spread',
      'total_points',
    ]);
  });

  it('orders cards by first appearance and Markets by display order, then response order', () => {
    const layout = layoutOf('moneyline', 0, FULL_GAME);
    const markets = [
      createMarket('b-second', { group: choice('b', 1), layout }),
      createMarket('a-tie-1', { group: choice('a'), layout }),
      createMarket('b-first', { group: choice('b', 0), layout }),
      createMarket('a-first', { group: choice('a', 0), layout }),
      createMarket('a-tie-2', { group: choice('a'), layout }),
    ];

    expect(sectionsOf(markets)?.[0].periods[0].cards).toEqual([
      { type: 'choice', key: 'b', markets: ['b-first', 'b-second'] },
      {
        type: 'choice',
        key: 'a',
        markets: ['a-first', 'a-tie-1', 'a-tie-2'],
      },
    ]);
  });

  it('sums every period in a section for its volume, counting a missing volume as 0', () => {
    const markets = [
      createMarket('full', {
        layout: layoutOf('spread', 1, FULL_GAME),
        volume: '1200.5',
      }),
      createMarket('half', {
        layout: layoutOf('spread', 1, FIRST_HALF),
        volume: '99.5',
      }),
      createMarket('no-volume', { layout: layoutOf('spread', 1, FIRST_HALF) }),
      createMarket('moneyline', {
        layout: layoutOf('moneyline', 0, FULL_GAME),
      }),
    ];

    const { tabs } = createMarketLayoutProjection(markets);

    expect(tabs[0].sections.map(({ key, volume }) => [key, volume])).toEqual([
      ['moneyline', undefined],
      ['spread', '1300'],
    ]);
    expect(tabs[0].sections[0]).not.toHaveProperty('volume');
  });
});
