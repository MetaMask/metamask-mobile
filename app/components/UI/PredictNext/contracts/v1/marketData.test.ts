import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { PredictError, PredictErrorCode } from '../../errors';
import composedNflGame from './fixtures/composed-nfl-game.json';
import marketHistoryMillisecondUtc from './fixtures/market-history-millisecond-utc.json';
import {
  parsePredictEvent,
  parsePredictFeed,
  parsePredictMarketHistory,
  parsePredictVenueStatus,
  PredictMarketGroupSchema,
  PredictMarketOptionSchema,
} from './marketData';

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const venueId = 'kalshi';

const createOutcome = (side: 'yes' | 'no', overrides = {}) => ({
  id: `market-1-${side}`,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: side === 'yes' ? '0.42' : '0.61',
  bidPrice: side === 'yes' ? '0.40' : '0.58',
  ...overrides,
});

const createMarket = (overrides = {}) => ({
  id: 'market-1',
  question: 'Will the team win?',
  outcomes: [createOutcome('yes'), createOutcome('no')],
  status: 'active' as const,
  ...overrides,
});

const createEvent = (overrides = {}) => ({
  venueId,
  id: 'event-1',
  title: 'Game outcome',
  markets: [createMarket()],
  ...overrides,
});

const createMarketHistory = (overrides = {}) => ({
  venueId,
  marketId: 'market-1',
  range: '1D',
  observedAt: '2026-08-07T12:00:00Z',
  points: [
    {
      timestamp: '2026-08-07T11:00:00Z',
      yesPrice: '0.42',
      noPrice: '0.58',
    },
  ],
  ...overrides,
});

describe('Predict API canonical response parsers', () => {
  it('parses an event containing prices for each binary outcome', () => {
    const input = createEvent();

    const result = parsePredictEvent(input);

    expect(result).toEqual(input);
  });

  it('parses market rules and removes raw venue rule fields', () => {
    const input = createEvent({
      settlementSources: [
        { name: 'the Governing League', url: 'https://www.nfl.com/' },
        { name: 'ESPN', url: 'https://www.espn.com/' },
      ],
      markets: [
        createMarket({
          rules: 'Primary rule.\n\nSecondary rule.',
          rules_primary: 'Primary rule.',
          rules_secondary: 'Secondary rule.',
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.settlementSources).toEqual([
      { name: 'the Governing League', url: 'https://www.nfl.com/' },
      { name: 'ESPN', url: 'https://www.espn.com/' },
    ]);
    expect(result.markets[0].rules).toBe('Primary rule.\n\nSecondary rule.');
    expect(result.markets[0]).not.toHaveProperty('rules_primary');
    expect(result.markets[0]).not.toHaveProperty('rules_secondary');
  });

  it('parses a numeric market-selector group and masks unknown fields', () => {
    const input = createEvent({
      markets: [
        createMarket({
          group: {
            key: 'total-points',
            groupType: 'marketSelector',
            marketType: 'total',
            option: { type: 'number', value: 220.5 },
            displayOrder: 0,
            unknown: 'discard',
          },
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.markets[0].group).toEqual({
      key: 'total-points',
      groupType: 'marketSelector',
      marketType: 'total',
      option: { type: 'number', value: 220.5 },
      displayOrder: 0,
    });
    expect(result.markets[0].group).not.toHaveProperty('unknown');
  });

  it('accepts an unsupported group type without specializing it', () => {
    const [error, result] = PredictMarketGroupSchema.validate({
      key: 'future-group',
      groupType: 'future-group-type',
    });

    expect(error).toBeUndefined();
    expect(result).toEqual({
      key: 'future-group',
      groupType: 'future-group-type',
    });
  });

  it('ignores selector fields on an unsupported group type', () => {
    const [error, result] = PredictMarketGroupSchema.validate(
      {
        key: 'future-group',
        groupType: 'future-group-type',
        marketType: '',
        option: { type: 'unexpected', value: 'not-a-number' },
        displayOrder: -1,
      },
      { coerce: true },
    );

    expect(error).toBeUndefined();
    expect(result).toEqual({
      key: 'future-group',
      groupType: 'future-group-type',
    });
  });

  it.each(['', ' ', '\t'])('rejects a group key with value %j', (key) => {
    const [error] = PredictMarketGroupSchema.validate({
      key,
      groupType: 'future-group-type',
    });

    expect(error).toBeDefined();
  });

  it('rejects whitespace-only selector fields', () => {
    const [error] = PredictMarketGroupSchema.validate({
      key: 'total-points',
      groupType: 'marketSelector',
      marketType: ' ',
      option: { type: 'number', value: 220.5 },
    });

    expect(error).toBeDefined();
  });

  it.each([
    {
      name: 'a marketSelector group without marketType',
      group: {
        key: 'total-points',
        groupType: 'marketSelector',
        option: { type: 'number', value: 220.5 },
      },
    },
    {
      name: 'a marketSelector group with an empty marketType',
      group: {
        key: 'total-points',
        groupType: 'marketSelector',
        marketType: '',
        option: { type: 'number', value: 220.5 },
      },
    },
    {
      name: 'a marketSelector group without option',
      group: {
        key: 'total-points',
        groupType: 'marketSelector',
        marketType: 'total',
      },
    },
    {
      name: 'a group with a non-numeric option',
      group: {
        key: 'total-points',
        groupType: 'marketSelector',
        marketType: 'total',
        option: { type: 'number', value: '220.5' },
      },
    },
    {
      name: 'a group with a negative displayOrder',
      group: {
        key: 'total-points',
        groupType: 'marketSelector',
        marketType: 'total',
        option: { type: 'number', value: 220.5 },
        displayOrder: -1,
      },
    },
  ])('drops $name and keeps the Market', ({ group }) => {
    const result = parsePredictEvent(
      createEvent({ markets: [createMarket({ group })] }),
    );

    expect(result.markets[0].id).toBe('market-1');
    expect(result.markets[0].group).toBeUndefined();
  });

  it('rejects non-finite numeric market options', () => {
    const [error] = PredictMarketOptionSchema.validate({
      type: 'number',
      value: Number.NaN,
    });

    expect(error).toBeDefined();
  });

  it.each([
    {
      name: 'Event-only rules',
      eventRules: 'Event rule.',
      marketRules: undefined,
    },
    {
      name: 'Market-only rules',
      eventRules: undefined,
      marketRules: 'Market rule.',
    },
    {
      name: 'different Event and Market rules',
      eventRules: 'Event rule.',
      marketRules: 'Market rule.',
    },
    {
      name: 'identical Event and Market rules',
      eventRules: 'Shared rule.',
      marketRules: 'Shared rule.',
    },
    {
      name: 'absent rules',
      eventRules: undefined,
      marketRules: undefined,
    },
  ])(
    'preserves $name in the canonical response',
    ({ eventRules, marketRules }) => {
      const input = createEvent({
        rules: eventRules,
        markets: [createMarket({ rules: marketRules })],
      });

      const result = parsePredictEvent(input);

      expect(result.rules).toBe(eventRules);
      expect(result.markets[0].rules).toBe(marketRules);
    },
  );

  it.each([
    {
      name: 'an empty source name',
      source: { name: '', url: 'https://www.espn.com/' },
    },
    {
      name: 'a whitespace-only source name',
      source: { name: '   ', url: 'https://www.espn.com/' },
    },
    {
      name: 'an insecure source URL',
      source: { name: 'ESPN', url: 'http://www.espn.com/' },
    },
    {
      name: 'a malformed source URL',
      source: { name: 'ESPN', url: 'not-a-url' },
    },
  ])('rejects a settlement source with $name', ({ source }) => {
    const input = createEvent({ settlementSources: [source] });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('parses a closed Market', () => {
    const input = createEvent({
      markets: [createMarket({ status: 'closed' })],
    });

    expect(parsePredictEvent(input).markets[0].status).toBe('closed');
  });

  it('parses an event containing an ask without a bid', () => {
    const input = createEvent({
      markets: [
        createMarket({
          outcomes: [
            createOutcome('yes', { bidPrice: undefined }),
            createOutcome('no'),
          ],
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.markets[0].outcomes[0]).toEqual(
      expect.objectContaining({ askPrice: '0.42' }),
    );
    expect(result.markets[0].outcomes[0].bidPrice).toBeUndefined();
  });

  it.each(['0', '0.0', '0.42', '1', '1.000'])(
    'parses the price %s in the inclusive unit interval',
    (price) => {
      const input = createEvent({
        markets: [
          createMarket({
            outcomes: [
              createOutcome('yes', { askPrice: price }),
              createOutcome('no'),
            ],
          }),
        ],
      });

      const result = parsePredictEvent(input);

      expect(result.markets[0].outcomes[0].askPrice).toBe(price);
    },
  );

  it.each(['-0.1', '+0.5', '0.5 ', '1.01', '5e-1', ''])(
    'rejects the price representation %s',
    (price) => {
      const input = createEvent({
        markets: [
          createMarket({
            outcomes: [
              createOutcome('yes', { askPrice: price }),
              createOutcome('no'),
            ],
          }),
        ],
      });

      expect(() => parsePredictEvent(input)).toThrow(
        'Invalid Predict API response.',
      );
    },
  );

  it('discards unknown fields throughout an event', () => {
    const input = {
      ...createEvent(),
      venuePayload: 'discard',
      markets: [
        {
          ...createMarket(),
          venueMarketPayload: 'discard',
          outcomes: [
            { ...createOutcome('yes'), venueOutcomePayload: 'discard' },
            createOutcome('no'),
          ],
        },
      ],
    };

    const result = parsePredictEvent(input);

    expect(result).not.toHaveProperty('venuePayload');
    expect(result.markets[0]).not.toHaveProperty('venueMarketPayload');
    expect(result.markets[0].outcomes[0]).not.toHaveProperty(
      'venueOutcomePayload',
    );
  });

  it('rejects an event without markets', () => {
    const input = createEvent({ markets: [] });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects a market with two outcomes on the same side', () => {
    const input = createEvent({
      markets: [
        createMarket({
          outcomes: [createOutcome('yes'), createOutcome('yes')],
        }),
      ],
    });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects an event with a malformed timestamp', () => {
    const input = createEvent({ startsAt: 'not-a-timestamp' });

    try {
      parsePredictEvent(input);
      throw new Error('Expected parser to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictError);
      expect((error as PredictError).code).toBe(PredictErrorCode.UNKNOWN);
    }
  });

  it('parses category, volume, 24-hour volume, and image URL on an event', () => {
    const input = createEvent({
      category: 'Senate',
      volume: '1500000',
      volume24h: '250000',
      imageUrl: 'https://example.com/event.png',
      markets: [
        createMarket({
          volume: '1000',
          volume24h: '250',
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.category).toBe('Senate');
    expect(result.volume).toBe('1500000');
    expect(result.volume24h).toBe('250000');
    expect(result.markets[0].volume).toBe('1000');
    expect(result.markets[0].volume24h).toBe('250');
    expect(result.imageUrl).toBe('https://example.com/event.png');
  });

  it.each([
    '/images/event.png',
    'http://example.com/event.png',
    'data:image/png;base64,encoded-image',
    'https:example.com/event.png',
  ])('rejects image URL %s', (imageUrl) => {
    const input = createEvent({ imageUrl });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('parses an American-football Game Event', () => {
    const input = createEvent({
      startsAt: '2026-09-11T00:20:00Z',
      sports: {
        sport: { id: 'american-football', label: 'American football' },
        competition: { id: 'nfl', label: 'NFL' },
        game: {
          status: 'in_progress',
          awayTeam: {
            name: 'Arizona Cardinals',
            abbreviation: 'ARI',
            logoUrl: 'https://example.com/ari.png',
            primaryColor: `#${'97233F'}`,
          },
          homeTeam: { name: 'Carolina Panthers' },
          score: { away: '17', home: '21' },
          period: 'Q4',
          clock: '12:22',
          observedAt: '2026-09-11T02:30:00Z',
        },
      },
      markets: [
        createMarket({
          status: 'active',
          outcomes: [
            createOutcome('yes', { gameSelection: 'away' }),
            createOutcome('no', { gameSelection: 'draw' }),
          ],
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result).toEqual(input);
  });

  it('parses the Game Team order and each Team logo facing', () => {
    const input = createEvent({
      sports: {
        sport: { id: 'soccer', label: 'Soccer' },
        game: {
          status: 'scheduled',
          teamOrder: 'home_first',
          homeTeam: { name: 'Arsenal', logoFacing: 'left' },
          awayTeam: { name: 'Chelsea', logoFacing: 'right' },
          observedAt: '2026-09-11T00:00:00Z',
        },
      },
    });

    const result = parsePredictEvent(input);

    expect(result.sports?.game).toMatchObject({
      teamOrder: 'home_first',
      homeTeam: { logoFacing: 'left' },
      awayTeam: { logoFacing: 'right' },
    });
  });

  it('leaves the Team order and logo facing absent when the API omits them', () => {
    const input = createEvent({
      sports: {
        sport: { id: 'american-football', label: 'American football' },
        game: {
          status: 'scheduled',
          homeTeam: { name: 'Carolina Panthers' },
          awayTeam: { name: 'Arizona Cardinals' },
          observedAt: '2026-09-11T00:00:00Z',
        },
      },
    });

    const result = parsePredictEvent(input);

    expect(result.sports?.game?.teamOrder).toBeUndefined();
    expect(result.sports?.game?.homeTeam.logoFacing).toBeUndefined();
    expect(result.sports?.game?.awayTeam.logoFacing).toBeUndefined();
  });

  it.each([
    { field: 'status', value: 'playing' },
    { field: 'observedAt', value: 'yesterday' },
    { field: 'primaryColor', value: 'red' },
    { field: 'logoUrl', value: 'http://example.com/ari.png' },
    { field: 'logoFacing', value: 'up' },
    { field: 'teamOrder', value: 'alphabetical' },
  ])('rejects Game data with malformed $field', ({ field, value }) => {
    const game = {
      status: 'scheduled',
      awayTeam: { name: 'Arizona Cardinals' },
      homeTeam: { name: 'Carolina Panthers' },
      observedAt: '2026-09-11T00:00:00Z',
    };
    const input = createEvent({
      sports: {
        sport: { id: 'american-football', label: 'American football' },
        game:
          field === 'primaryColor' ||
          field === 'logoUrl' ||
          field === 'logoFacing'
            ? {
                ...game,
                awayTeam: { ...game.awayTeam, [field]: value },
              }
            : { ...game, [field]: value },
      },
    });

    expect(() => parsePredictEvent(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('keeps a market-selector group and strips unknown group fields', () => {
    const input = createEvent({
      markets: [
        createMarket({
          group: {
            key: 'KXNFLTOTAL-1:total',
            groupType: 'marketSelector',
            marketType: 'total',
            option: { type: 'number', value: 44.5 },
            displayOrder: 0,
            extra: 'discard',
          },
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.markets[0].group).toEqual({
      key: 'KXNFLTOTAL-1:total',
      groupType: 'marketSelector',
      marketType: 'total',
      option: { type: 'number', value: 44.5 },
      displayOrder: 0,
    });
  });

  it('keeps an unsupported group type so winner quotes can ignore grouped Markets', () => {
    const input = createEvent({
      markets: [
        createMarket({
          group: {
            key: 'future-group',
            groupType: 'future-group-type',
          },
        }),
      ],
    });

    const result = parsePredictEvent(input);

    expect(result.markets[0].group).toEqual({
      key: 'future-group',
      groupType: 'future-group-type',
    });
  });

  describe('a malformed group on one line of an Event', () => {
    const totalLine = (id: string, value: number, displayOrder: number) =>
      createMarket({
        id,
        group: {
          key: 'game:total',
          groupType: 'marketSelector',
          marketType: 'total',
          option: { type: 'number', value },
          displayOrder,
        },
      });
    const moneyline = createMarket({
      id: 'moneyline',
      group: { key: 'game:moneyline', groupType: 'choice', displayOrder: 0 },
    });
    const standalone = createMarket({ id: 'standalone' });

    beforeEach(() => {
      jest.mocked(DevLogger.log).mockClear();
    });

    it.each([
      {
        name: 'without option',
        group: {
          key: 'game:total',
          groupType: 'marketSelector',
          marketType: 'total',
          displayOrder: 1,
        },
      },
      {
        name: 'with a non-numeric option value',
        group: {
          key: 'game:total',
          groupType: 'marketSelector',
          marketType: 'total',
          option: { type: 'number', value: 'over' },
          displayOrder: 1,
        },
      },
      {
        name: 'with an empty marketType',
        group: {
          key: 'game:total',
          groupType: 'marketSelector',
          marketType: '',
          option: { type: 'number', value: 47.5 },
          displayOrder: 1,
        },
      },
      {
        name: 'with a whitespace key on an unknown group type',
        group: { key: ' ', groupType: 'future-group-type' },
      },
    ])('loads the Event and drops only the group $name', ({ group }) => {
      const validMarkets = [
        moneyline,
        totalLine('total-44', 44.5, 0),
        totalLine('total-50', 50.5, 2),
        standalone,
      ];
      const input = createEvent({
        markets: [
          ...validMarkets.slice(0, 2),
          createMarket({ id: 'malformed', group }),
          ...validMarkets.slice(2),
        ],
      });

      const result = parsePredictEvent(input);

      expect(result.markets.map(({ id }) => id)).toEqual([
        'moneyline',
        'total-44',
        'malformed',
        'total-50',
        'standalone',
      ]);
      expect(result.markets[2]).toEqual(createMarket({ id: 'malformed' }));
      expect(result.markets.filter(({ id }) => id !== 'malformed')).toEqual(
        validMarkets,
      );
    });

    it('logs the dropped group in dev', () => {
      parsePredictEvent(
        createEvent({
          markets: [
            createMarket({
              group: {
                key: 'game:total',
                groupType: 'marketSelector',
                marketType: 'total',
              },
            }),
          ],
        }),
      );

      expect(DevLogger.log).toHaveBeenCalledTimes(1);
      expect(DevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Dropped malformed Market group "game:total"'),
        expect.any(String),
      );
    });

    it('does not log a valid or missing group', () => {
      parsePredictEvent(createEvent({ markets: [moneyline, standalone] }));

      expect(DevLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('Event screen layout and choice groups', () => {
    const layout = {
      tab: { key: 'game_lines', order: 0 },
      section: { key: 'moneyline', order: 0 },
      subgroup: { key: 'full_game', order: 0 },
    };

    it('parses a composed game with layout, choice and line-picker groups', () => {
      const result = parsePredictEvent(composedNflGame);

      expect(result.markets).toHaveLength(9);
      expect(result.markets[0]).toMatchObject({
        group: {
          key: 'KXNFLGAME-26NOV02CHISEA:moneyline',
          groupType: 'choice',
          displayOrder: 0,
        },
        layout,
      });
      expect(result.markets[3].layout?.subgroup?.key).toBe('first_half');
      expect(result.markets[5].group).toMatchObject({
        groupType: 'marketSelector',
        marketType: 'spread',
      });
    });

    it('parses a Market without layout', () => {
      const result = parsePredictEvent(createEvent());

      expect(result.markets[0].layout).toBeUndefined();
    });

    it('parses layout keys it does not know', () => {
      const unknownLayout = {
        tab: { key: 'player_props', order: 4 },
        section: { key: 'passing_yards', order: 0 },
      };

      const result = parsePredictEvent(
        createEvent({ markets: [createMarket({ layout: unknownLayout })] }),
      );

      expect(result.markets[0].layout).toEqual(unknownLayout);
    });

    it('strips unknown fields from layout levels', () => {
      const result = parsePredictEvent(
        createEvent({
          markets: [
            createMarket({
              layout: {
                ...layout,
                tab: { key: 'game_lines', order: 0, label: 'Game lines' },
                extra: true,
              },
            }),
          ],
        }),
      );

      expect(result.markets[0].layout).toEqual(layout);
    });

    it.each([
      { name: 'no section', value: { tab: layout.tab } },
      {
        name: 'an empty key',
        value: { ...layout, section: { key: ' ', order: 0 } },
      },
      {
        name: 'a fractional order',
        value: { ...layout, subgroup: { key: 'q1', order: 1.5 } },
      },
      { name: 'a string', value: 'game_lines' },
    ])('drops a layout with $name and keeps the Market', ({ value }) => {
      const result = parsePredictEvent(
        createEvent({ markets: [createMarket({ layout: value })] }),
      );

      expect(result.markets[0].id).toBe('market-1');
      expect(result.markets[0].layout).toBeUndefined();
    });

    it('parses a choice group with and without display order', () => {
      expect(
        PredictMarketGroupSchema.create({
          key: 'game:moneyline',
          groupType: 'choice',
          displayOrder: 2,
          marketType: 'ignored',
        }),
      ).toEqual({
        key: 'game:moneyline',
        groupType: 'choice',
        displayOrder: 2,
      });
      expect(
        PredictMarketGroupSchema.create({
          key: 'game:moneyline',
          groupType: 'choice',
        }),
      ).toEqual({ key: 'game:moneyline', groupType: 'choice' });
    });

    it.each([
      {
        key: 'game:rushing_yards:henry',
        groupType: 'choice',
        displayOrder: 0,
      },
      {
        key: 'game:spread',
        groupType: 'marketSelector',
        marketType: 'spread',
        option: { type: 'number', value: 2.5 },
      },
      { key: 'game:future', groupType: 'future-group-type' },
    ])('keeps a label on a $groupType group', (group) => {
      expect(
        PredictMarketGroupSchema.create({ ...group, label: 'Derrick Henry' }),
      ).toEqual({ ...group, label: 'Derrick Henry' });
    });

    it.each(['', '  '])('rejects a group label of %j', (label) => {
      expect(() =>
        PredictMarketGroupSchema.create({
          key: 'game:rushing_yards:henry',
          groupType: 'choice',
          label,
        }),
      ).toThrow();
    });

    it('keeps a malformed choice group as an unsupported group', () => {
      expect(
        PredictMarketGroupSchema.create({
          key: 'game:moneyline',
          groupType: 'choice',
          displayOrder: -1,
        }),
      ).toEqual({ key: 'game:moneyline', groupType: 'choice' });
    });

    it('parses a team total line picker', () => {
      expect(
        PredictMarketGroupSchema.create({
          key: 'game:team_total:sea',
          groupType: 'marketSelector',
          marketType: 'team_total',
          option: { type: 'number', value: 20.5 },
          displayOrder: 0,
        }),
      ).toMatchObject({ marketType: 'team_total' });
    });
  });

  it('parses a paginated event response', () => {
    const input = {
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: [createEvent()],
      nextCursor: 'next-page',
    };

    const result = parsePredictFeed(input);

    expect(result.events).toHaveLength(1);
    expect(result.nextCursor).toBe('next-page');
  });

  it('parses an available Venue Status observation', () => {
    const input = {
      venueId,
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
      addition: 'discard',
    };

    const result = parsePredictVenueStatus(input);

    expect(result).toEqual({
      venueId,
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
    });
  });

  it('keeps the backend-owned terms URL and fails closed on a malformed one', () => {
    const withTerms = parsePredictVenueStatus({
      venueId,
      status: 'available',
      checkedAt: '2026-08-07T12:00:00Z',
      termsUrl: 'https://kalshi.com/regulatory/agreement',
    });
    expect(withTerms.termsUrl).toBe('https://kalshi.com/regulatory/agreement');

    // Wire drift on a backend-owned field fails closed at the boundary.
    expect(() =>
      parsePredictVenueStatus({
        venueId,
        status: 'available',
        checkedAt: '2026-08-07T12:00:00Z',
        termsUrl: 'not-a-url',
      }),
    ).toThrow();
  });

  it('parses Market history', () => {
    const input = createMarketHistory();

    expect(parsePredictMarketHistory(input)).toEqual(input);
  });

  it('parses Market history for the ALL range', () => {
    const input = createMarketHistory({ range: 'ALL' });

    expect(parsePredictMarketHistory(input)).toEqual(input);
  });

  it('parses the shared Market history response with millisecond UTC timestamps', () => {
    const result = parsePredictMarketHistory(marketHistoryMillisecondUtc);

    expect(result).toEqual(marketHistoryMillisecondUtc);
  });

  it.each(['2026-08-17T20:07:30Z', '2026-08-17T20:07:30.1234Z'])(
    'parses supported UTC timestamp precision %s',
    (timestamp) => {
      const input = createMarketHistory({ observedAt: timestamp, points: [] });

      expect(parsePredictMarketHistory(input).observedAt).toBe(timestamp);
    },
  );

  it.each([
    '2026-08-17T20:07:30+00:00',
    '2026-08-17T20:07:30.000+01:00',
    '2026-08-17 20:07:30.000Z',
    '2026-08-17T20:07Z',
    '2026-02-30T20:07:30.000Z',
  ])('rejects unsupported or malformed timestamp %s', (timestamp) => {
    const input = createMarketHistory({ observedAt: timestamp, points: [] });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it.each([
    ['range', createMarketHistory({ range: 'FOO' })],
    ['timestamp', createMarketHistory({ observedAt: 'not-a-timestamp' })],
    [
      'non-complementary prices',
      createMarketHistory({
        points: [
          {
            timestamp: '2026-08-07T11:00:00Z',
            yesPrice: '0.42',
            noPrice: '0.57',
          },
        ],
      }),
    ],
  ])('rejects malformed Market history %s', (_field, input) => {
    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects Market history points that are not chronological', () => {
    const input = createMarketHistory({
      points: [
        {
          timestamp: '2026-08-07T11:00:00Z',
          yesPrice: '0.42',
          noPrice: '0.58',
        },
        {
          timestamp: '2026-08-07T10:00:00Z',
          yesPrice: '0.40',
          noPrice: '0.60',
        },
      ],
    });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });

  it('rejects Market history points after the backend observation time', () => {
    const input = createMarketHistory({
      points: [
        {
          timestamp: '2026-08-07T12:00:01Z',
          yesPrice: '0.42',
          noPrice: '0.58',
        },
      ],
    });

    expect(() => parsePredictMarketHistory(input)).toThrow(
      'Invalid Predict API response.',
    );
  });
});
