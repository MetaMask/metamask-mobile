import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { Side, type OrderPreview, type PredictOutcome } from '../../types';
import { PREDICT_ERROR_CODES } from '../../constants/errors';
import { PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS } from '../../constants/flags';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
} from './constants';
import {
  buildMarketListQueryParams,
  calculateConservativeBuyMarketFee,
  clearClobMarketInfoCache,
  clearClobMarketInfoSessionState,
  createApiKey,
  deriveApiKey,
  fetchChildEventsFromGammaApi,
  fetchEventsFromPolymarketApi,
  fetchMarketsFromPolymarketApi,
  fetchRelatedTagsFromPolymarketApi,
  normalizeRelatedTagsToFilterOptions,
  getAllowance,
  getClobMarketInfo,
  getClobMarketInfoSafe,
  getContractConfig,
  getIsApprovedForAll,
  getOrderBook,
  getRawBalance,
  getTickSizeRoundConfig,
  parsePolymarketEvents,
  parsePolymarketActivity,
  previewOrder,
  searchEventsFromPolymarketApi,
} from './utils';
import type {
  PolymarketApiActivity,
  PolymarketApiEvent,
  PolymarketApiTeam,
} from './types';

const mockSignTypedMessage = jest.fn();

jest.mock('@metamask/controller-utils', () => ({
  query: jest.fn(),
}));

jest.mock('@metamask/eth-query', () =>
  jest.fn().mockImplementation(() => ({})),
);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: (...args: unknown[]) => mockSignTypedMessage(...args),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;
const mockQuery = jest.mocked(query);
const mockLoggerError = jest.mocked(Logger.error);
const mockEthQuery = jest.mocked(EthQuery);
const mockFindNetworkClientIdByChainId = jest.mocked(
  Engine.context.NetworkController.findNetworkClientIdByChainId,
);
const mockGetNetworkClientById = jest.mocked(
  Engine.context.NetworkController.getNetworkClientById,
);

const apiKeyCreds = {
  apiKey: 'api-key',
  secret: 'secret',
  passphrase: 'passphrase',
};

const orderBook = {
  market: 'market-1',
  asset_id: 'token-1',
  hash: 'hash',
  timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  asks: [{ price: '0.50', size: '100' }],
  bids: [{ price: '0.49', size: '100' }],
  min_order_size: '1',
  tick_size: '0.01',
  neg_risk: false,
};

const buyPreview: OrderPreview = {
  marketId: 'market-1',
  outcomeId: 'condition-1',
  outcomeTokenId: 'token-1',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 20,
  slippage: 0.1,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  feeRateBps: '0',
};

describe('polymarket utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearClobMarketInfoSessionState();
    mockSignTypedMessage.mockResolvedValue('0xsig');
    mockFindNetworkClientIdByChainId.mockReturnValue('test-network-client-id');
    mockGetNetworkClientById.mockReturnValue({
      provider: {},
    } as ReturnType<
      typeof Engine.context.NetworkController.getNetworkClientById
    >);
  });

  const createRawActivity = (
    overrides: Partial<PolymarketApiActivity> = {},
  ): PolymarketApiActivity => ({
    type: 'TRADE',
    side: 'BUY',
    price: 0.5,
    usdcSize: 10,
    timestamp: 100,
    transactionHash: '0xtransaction',
    conditionId: 'condition-1',
    outcomeIndex: 0,
    title: 'Market',
    outcome: 'Yes',
    icon: 'icon.png',
    ...overrides,
  });

  const createNbaTeam = (
    abbreviation: string,
    overrides: Partial<PolymarketApiTeam> = {},
  ): PolymarketApiTeam => ({
    id: `team-${abbreviation}`,
    name: abbreviation.toUpperCase(),
    logo: `${abbreviation}.png`,
    abbreviation,
    color: 'red',
    alias: abbreviation.toUpperCase(),
    league: 'nba',
    ...overrides,
  });

  const nbaTeamsByAbbreviation: Record<string, PolymarketApiTeam> = {
    bos: createNbaTeam('bos'),
    nyk: createNbaTeam('nyk', { color: 'blue' }),
  };

  const createSportsMarket = ({
    id,
    sportsMarketType,
    volume = 100,
    overrides = {},
  }: {
    id: string;
    sportsMarketType?: string;
    volume?: number;
    overrides?: Partial<PolymarketApiEvent['markets'][number]>;
  }): PolymarketApiEvent['markets'][number] =>
    ({
      conditionId: id,
      question: `${id} question`,
      description: `${id} description`,
      icon: 'icon.png',
      image: 'image.png',
      groupItemTitle: id,
      sportsMarketType,
      status: 'open',
      volumeNum: volume,
      liquidity: 100,
      negRisk: false,
      clobTokenIds: `["${id}-yes","${id}-no"]`,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.5","0.5"]',
      closed: false,
      active: true,
      acceptingOrders: true,
      resolvedBy: '',
      orderPriceMinTickSize: 0.01,
      umaResolutionStatus: '',
      ...overrides,
    }) as PolymarketApiEvent['markets'][number];

  const createNbaGameEvent = (
    markets: PolymarketApiEvent['markets'],
  ): PolymarketApiEvent => ({
    id: 'nba-game-event',
    slug: 'nba-bos-nyk-2026-06-12',
    title: 'Boston Celtics vs New York Knicks',
    description: 'NBA game',
    icon: 'icon.png',
    closed: false,
    active: true,
    series: [
      {
        id: 'nba-series',
        slug: 'nba',
        title: 'NBA',
        recurrence: 'daily',
      },
    ],
    markets,
    tags: [
      { id: 'games', label: 'Games', slug: 'games' },
      { id: 'nba', label: 'NBA', slug: 'nba' },
    ],
    teams: Object.values(nbaTeamsByAbbreviation),
    liquidity: 100,
    volume: 100,
    gameId: 'nba-game-1',
    startTime: '2026-06-12T20:00:00.000Z',
    live: false,
    ended: false,
  });

  it('parses activity with deterministic ids when transaction hash is missing', () => {
    const rawActivity = createRawActivity({
      transactionHash: undefined as unknown as string,
    });

    const firstParse = parsePolymarketActivity([rawActivity]);
    const secondParse = parsePolymarketActivity([rawActivity]);

    expect(firstParse[0].id).toBe(secondParse[0].id);
  });

  it('parses same-transaction activity rows with distinct ids', () => {
    const parsedActivity = parsePolymarketActivity([
      createRawActivity({ conditionId: 'condition-1', outcomeIndex: 0 }),
      createRawActivity({ conditionId: 'condition-2', outcomeIndex: 1 }),
    ]);

    expect(parsedActivity[0].id).not.toBe(parsedActivity[1].id);
  });

  it('preserves trade size from activity rows', () => {
    const rawActivity = createRawActivity({
      price: 0.18,
      size: 11.11111,
      usdcSize: 2.129179,
    });

    const [parsedActivity] = parsePolymarketActivity([rawActivity]);

    expect(parsedActivity.entry).toMatchObject({
      type: 'buy',
      amount: 2.129179,
      price: 0.18,
      size: 11.11111,
    });
  });

  it('preserves market slugs from activity rows when present', () => {
    const [activity] = parsePolymarketActivity([
      createRawActivity({
        slug: 'will-it-rain-tomorrow',
        eventSlug: 'weather-markets',
      }),
    ]);

    expect(activity.slug).toBe('will-it-rain-tomorrow');
    expect(activity.eventSlug).toBe('weather-markets');
  });

  it('preserves P&L fields from activity rows when present', () => {
    const [activity] = parsePolymarketActivity([
      createRawActivity({
        netPnlUsd: -2.5,
        totalNetPnlUsd: 12.5,
      }),
    ]);

    expect(activity.netPnlUsd).toBe(-2.5);
    expect(activity.totalNetPnlUsd).toBe(12.5);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['zero', 0],
    ['empty string', ''],
  ])('omits %s trade size instead of coercing it to zero', (_label, size) => {
    const [activity] = parsePolymarketActivity([
      createRawActivity({
        size: size as PolymarketApiActivity['size'],
        usdcSize: 2.129179,
        price: 0.18,
      }),
    ]);

    expect(activity.entry).toMatchObject({
      type: 'buy',
      amount: 2.129179,
      price: 0.18,
    });
    expect(activity.entry).not.toHaveProperty('size');
  });

  it('builds outcome groups only from supported and enabled sports market types', () => {
    const event = createNbaGameEvent([
      createSportsMarket({ id: 'moneyline', sportsMarketType: 'moneyline' }),
      createSportsMarket({ id: 'spreads', sportsMarketType: 'spreads' }),
      createSportsMarket({ id: 'totals', sportsMarketType: 'totals' }),
      createSportsMarket({ id: 'points', sportsMarketType: 'points' }),
      createSportsMarket({
        id: 'first-half-moneyline',
        sportsMarketType: 'first_half_moneyline',
      }),
    ]);

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) =>
        nbaTeamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['nba'],
      enabledSportsMarketTypes: [
        'moneyline',
        'spreads',
        'totals',
        'points',
        'first_half_moneyline',
      ],
    });

    expect(market.outcomes).toHaveLength(5);
    expect(market.outcomes.map((outcome) => outcome.sportsMarketType)).toEqual(
      expect.arrayContaining([
        'moneyline',
        'spreads',
        'totals',
        'points',
        'first_half_moneyline',
      ]),
    );
    expect(market.outcomeGroups).toEqual([
      expect.objectContaining({
        key: 'game_lines',
        outcomes: [],
        subgroups: [
          expect.objectContaining({ key: 'moneyline' }),
          expect.objectContaining({ key: 'spreads' }),
          expect.objectContaining({ key: 'totals' }),
        ],
      }),
    ]);
  });

  it('surfaces extra time and penalty shootout as binary game lines subgroups', () => {
    const event = createNbaGameEvent([
      createSportsMarket({ id: 'moneyline', sportsMarketType: 'moneyline' }),
      createSportsMarket({
        id: 'extra-time',
        sportsMarketType: 'soccer_extra_time',
      }),
      createSportsMarket({
        id: 'penalty-shootout',
        sportsMarketType: 'soccer_penalty_shootout',
      }),
    ]);

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) =>
        nbaTeamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['nba'],
      enabledSportsMarketTypes: [
        'moneyline',
        'soccer_extra_time',
        'soccer_penalty_shootout',
      ],
    });

    const gameLines = market.outcomeGroups?.find(
      (group) => group.key === 'game_lines',
    );

    expect(gameLines?.subgroups?.map((subgroup) => subgroup.key)).toEqual([
      'moneyline',
      'soccer_extra_time',
      'soccer_penalty_shootout',
    ]);

    const extraTime = gameLines?.subgroups?.find(
      (subgroup) => subgroup.key === 'soccer_extra_time',
    );
    expect(extraTime?.outcomes[0]?.tokens.map((token) => token.title)).toEqual([
      'Yes',
      'No',
    ]);
  });

  it('keeps supported but unlisted sports market types out of outcome groups', () => {
    const event = createNbaGameEvent([
      createSportsMarket({ id: 'moneyline', sportsMarketType: 'moneyline' }),
      createSportsMarket({ id: 'spreads', sportsMarketType: 'spreads' }),
      createSportsMarket({ id: 'totals', sportsMarketType: 'totals' }),
    ]);

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) =>
        nbaTeamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['nba'],
      enabledSportsMarketTypes: ['moneyline'],
    });

    expect(market.outcomes).toHaveLength(3);
    expect(market.outcomes.map((outcome) => outcome.sportsMarketType)).toEqual(
      expect.arrayContaining(['moneyline', 'spreads', 'totals']),
    );
    expect(market.outcomeGroups).toEqual([
      expect.objectContaining({
        key: 'game_lines',
        outcomes: [expect.objectContaining({ sportsMarketType: 'moneyline' })],
      }),
    ]);
  });

  it('defaults outcome groups to supported market types when enabledSportsMarketTypes is missing', () => {
    const event = createNbaGameEvent([
      createSportsMarket({ id: 'moneyline', sportsMarketType: 'moneyline' }),
      createSportsMarket({ id: 'spreads', sportsMarketType: 'spreads' }),
    ]);

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) =>
        nbaTeamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['nba'],
    });

    expect(market.outcomes).toHaveLength(2);
    expect(market.outcomes.map((outcome) => outcome.sportsMarketType)).toEqual(
      expect.arrayContaining(['moneyline', 'spreads']),
    );
    expect(market.outcomeGroups).toEqual([
      expect.objectContaining({
        key: 'game_lines',
        outcomes: [],
        subgroups: [
          expect.objectContaining({ key: 'moneyline' }),
          expect.objectContaining({ key: 'spreads' }),
        ],
      }),
    ]);
  });

  it('does not build outcome groups when enabledSportsMarketTypes is empty', () => {
    const event = createNbaGameEvent([
      createSportsMarket({ id: 'moneyline', sportsMarketType: 'moneyline' }),
      createSportsMarket({ id: 'spreads', sportsMarketType: 'spreads' }),
    ]);

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) =>
        nbaTeamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['nba'],
      enabledSportsMarketTypes: [],
    });

    expect(market.outcomes).toHaveLength(2);
    expect(market.outcomeGroups).toBeUndefined();
  });

  it('uses group item title for neg-risk soccer first-to-score yes token labels', () => {
    const event = createNbaGameEvent([
      createSportsMarket({
        id: 'portugal-first',
        sportsMarketType: 'soccer_first_to_score',
        overrides: {
          groupItemTitle: 'Portugal',
          negRisk: true,
          clobTokenIds: '["portugal-yes","portugal-no"]',
          outcomePrices: '["0.83","0.17"]',
        },
      }),
      createSportsMarket({
        id: 'neither-first',
        sportsMarketType: 'soccer_first_to_score',
        overrides: {
          groupItemTitle: 'Neither',
          negRisk: true,
          clobTokenIds: '["neither-yes","neither-no"]',
          outcomePrices: '["0.03","0.97"]',
        },
      }),
      createSportsMarket({
        id: 'uzbekistan-first',
        sportsMarketType: 'soccer_first_to_score',
        overrides: {
          groupItemTitle: 'Uzbekistan',
          negRisk: true,
          clobTokenIds: '["uzbekistan-yes","uzbekistan-no"]',
          outcomePrices: '["0.13","0.87"]',
        },
      }),
    ]);

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
    });

    expect(market.outcomes.map((outcome) => outcome.tokens[0].title)).toEqual([
      'Portugal',
      'Neither',
      'Uzbekistan',
    ]);
  });

  it('parses World Cup game events with game metadata when team data is available', () => {
    const teamsByAbbreviation: Record<string, PolymarketApiTeam> = {
      usa: {
        id: 'team-usa',
        name: 'United States',
        logo: 'usa.png',
        abbreviation: 'usa',
        color: 'red',
        alias: 'USA',
        league: 'fifwc',
      },
      can: {
        id: 'team-can',
        name: 'Canada',
        logo: 'can.png',
        abbreviation: 'can',
        color: 'white',
        alias: 'CAN',
        league: 'fifwc',
      },
    };
    const event: PolymarketApiEvent = {
      id: 'event-1',
      slug: 'fifwc-usa-can-2026-06-12',
      title: 'United States vs Canada',
      description: 'World Cup match',
      icon: 'icon.png',
      closed: false,
      active: true,
      series: [
        {
          id: '11433',
          slug: 'world-cup',
          title: 'World Cup',
          recurrence: 'none',
        },
      ],
      markets: [
        {
          conditionId: 'condition-1',
          question: 'United States vs Canada',
          description: 'Market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: 'United States',
          sportsMarketType: 'moneyline',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: true,
          clobTokenIds: '["token-yes","token-no"]',
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.5","0.5"]',
          closed: false,
          active: true,
          acceptingOrders: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
        {
          conditionId: 'condition-draw',
          question: 'United States vs Canada',
          description: 'Draw market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: 'Draw',
          sportsMarketType: 'moneyline',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: true,
          clobTokenIds: '["token-draw-yes","token-draw-no"]',
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.25","0.75"]',
          closed: false,
          active: true,
          acceptingOrders: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
      ],
      tags: [
        { id: 'games', label: 'Games', slug: 'games' },
        { id: 'world-cup', label: 'World Cup', slug: 'fifa-world-cup' },
      ],
      liquidity: 100,
      volume: 100,
      gameId: 'game-1',
      startTime: '2026-06-12T20:00:00.000Z',
      live: false,
      ended: false,
    };

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) => teamsByAbbreviation[abbreviation],
    });

    expect(market.game).toEqual(
      expect.objectContaining({
        id: 'game-1',
        league: 'fifwc',
        startTime: '2026-06-12T20:00:00.000Z',
        status: 'scheduled',
        homeTeam: expect.objectContaining({ abbreviation: 'usa' }),
        awayTeam: expect.objectContaining({ abbreviation: 'can' }),
      }),
    );
    expect(market.active).toBe(true);
    expect(market.outcomes[0]).toEqual(
      expect.objectContaining({
        active: true,
        acceptingOrders: true,
        image: 'usa.png',
        tokens: [
          expect.objectContaining({
            id: 'token-yes',
            title: 'United States',
            shortTitle: 'usa',
          }),
          expect.objectContaining({
            id: 'token-no',
            title: 'No',
            shortTitle: 'can',
          }),
        ],
      }),
    );
    expect(market.outcomes[1]).toEqual(
      expect.objectContaining({
        image: 'icon.png',
        tokens: [
          expect.objectContaining({
            id: 'token-draw-yes',
            title: 'Draw',
            shortTitle: 'Draw',
          }),
          expect.objectContaining({
            id: 'token-draw-no',
            title: 'No',
          }),
        ],
      }),
    );
  });

  it('does not apply team logo and short title normalization to non-moneyline markets', () => {
    const teamsByAbbreviation: Record<string, PolymarketApiTeam> = {
      usa: {
        id: 'team-usa',
        name: 'United States',
        logo: 'usa.png',
        abbreviation: 'usa',
        color: 'red',
        alias: 'USA',
        league: 'fifwc',
      },
      can: {
        id: 'team-can',
        name: 'Canada',
        logo: 'can.png',
        abbreviation: 'can',
        color: 'white',
        alias: 'CAN',
        league: 'fifwc',
      },
    };
    const event: PolymarketApiEvent = {
      id: 'event-non-moneyline',
      slug: 'fifwc-usa-can-2026-06-12',
      title: 'United States vs Canada',
      description: 'World Cup match',
      icon: 'icon.png',
      closed: false,
      active: true,
      series: [
        {
          id: '11433',
          slug: 'world-cup',
          title: 'World Cup',
          recurrence: 'none',
        },
      ],
      markets: [
        {
          conditionId: 'condition-non-moneyline',
          question: 'United States vs Canada',
          description: 'Market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: 'United States',
          sportsMarketType: 'custom_market',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: true,
          clobTokenIds: '["token-yes","token-no"]',
          outcomes: '["Yes","No"]',
          outcomePrices: '["0.5","0.5"]',
          closed: false,
          active: true,
          acceptingOrders: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
      ],
      tags: [
        { id: 'games', label: 'Games', slug: 'games' },
        { id: 'world-cup', label: 'World Cup', slug: 'fifa-world-cup' },
      ],
      liquidity: 100,
      volume: 100,
      gameId: 'game-1',
      startTime: '2026-06-12T20:00:00.000Z',
      live: false,
      ended: false,
    };

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) => teamsByAbbreviation[abbreviation],
    });

    expect(market.outcomes[0]).toEqual(
      expect.objectContaining({
        image: 'icon.png',
        tokens: [
          { id: 'token-yes', title: 'Yes', price: 0.5 },
          { id: 'token-no', title: 'No', price: 0.5 },
        ],
      }),
    );
  });

  it('parses ATP game events from provider metadata when league tag is missing', () => {
    const teamsByAbbreviation: Record<string, PolymarketApiTeam> = {
      ivashka: {
        id: 'team-ivashka',
        name: 'Ilya Ivashka',
        logo: 'ivashka.png',
        abbreviation: 'ivashka',
        color: 'red',
        alias: 'I. Ivashka',
        league: 'atp',
      },
      stewart: {
        id: 'team-stewart',
        name: 'Hamish Stewart',
        logo: 'stewart.png',
        abbreviation: 'stewart',
        color: 'orange',
        alias: 'H. Stewart',
        league: 'atp',
      },
    };
    const event: PolymarketApiEvent = {
      id: '509179',
      slug: 'atp-ivashka-stewart-2026-05-22',
      title: 'Bengaluru 3: Ilya Ivashka vs Hamish Stewart',
      description: 'ATP match',
      icon: 'icon.png',
      closed: false,
      active: true,
      series: [
        {
          id: '10365',
          slug: 'atp',
          title: 'ATP',
          recurrence: 'daily',
        },
      ],
      markets: [
        {
          conditionId: 'condition-1',
          question: 'Bengaluru 3: Ilya Ivashka vs Hamish Stewart',
          description: 'Market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: '',
          groupItemThreshold: 0,
          sportsMarketType: 'moneyline',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: false,
          clobTokenIds: '["token-ivashka","token-stewart"]',
          outcomes: '["Ilya Ivashka","Hamish Stewart"]',
          outcomePrices: '["0.625","0.375"]',
          closed: false,
          active: true,
          acceptingOrders: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
      ],
      tags: [
        { id: 'tennis', label: 'Tennis', slug: 'tennis' },
        { id: 'games', label: 'Games', slug: 'games' },
      ],
      teams: [teamsByAbbreviation.ivashka, teamsByAbbreviation.stewart],
      liquidity: 100,
      volume: 100,
      gameId: '5658375',
      startTime: '2026-05-22T07:30:00Z',
      live: false,
      ended: false,
    };

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) => teamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['atp'],
    });

    expect(market.game).toEqual(
      expect.objectContaining({
        id: '5658375',
        league: 'atp',
        startTime: '2026-05-22T07:30:00Z',
        status: 'scheduled',
        homeTeam: expect.objectContaining({ abbreviation: 'ivashka' }),
        awayTeam: expect.objectContaining({ abbreviation: 'stewart' }),
      }),
    );
  });

  it('parses WTA game events from provider metadata when league tag is missing', () => {
    const teamsByAbbreviation: Record<string, PolymarketApiTeam> = {
      sasnovi: {
        id: 'team-sasnovi',
        name: 'Aliaksandra Sasnovich',
        logo: 'sasnovi.png',
        abbreviation: 'sasnovi',
        color: 'red',
        alias: 'A. Sasnovich',
        league: 'wta',
      },
      ribera: {
        id: 'team-ribera',
        name: 'Marina Bassols Ribera',
        logo: 'ribera.png',
        abbreviation: 'ribera',
        color: 'orange',
        alias: 'M. Ribera',
        league: 'wta',
      },
    };
    const event: PolymarketApiEvent = {
      id: '506439',
      slug: 'wta-sasnovi-ribera-2026-05-22',
      title:
        'Roland Garros, Qualification WTA: Aliaksandra Sasnovich vs Marina Bassols Ribera',
      description: 'WTA match',
      icon: 'icon.png',
      closed: false,
      active: true,
      series: [
        {
          id: '10366',
          slug: 'wta',
          title: 'WTA',
          recurrence: 'daily',
        },
      ],
      markets: [
        {
          conditionId: 'condition-1',
          question:
            'Roland Garros, Qualification WTA: Aliaksandra Sasnovich vs Marina Bassols Ribera',
          description: 'Market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: '',
          groupItemThreshold: 0,
          sportsMarketType: 'moneyline',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: false,
          clobTokenIds: '["token-sasnovi","token-ribera"]',
          outcomes: '["Aliaksandra Sasnovich","Marina Bassols Ribera"]',
          outcomePrices: '["0.735","0.265"]',
          closed: false,
          active: true,
          acceptingOrders: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
      ],
      tags: [
        { id: 'tennis', label: 'Tennis', slug: 'tennis' },
        { id: 'games', label: 'Games', slug: 'games' },
      ],
      teams: [teamsByAbbreviation.sasnovi, teamsByAbbreviation.ribera],
      liquidity: 100,
      volume: 100,
      gameId: '5655456',
      startTime: '2026-05-22T09:00:00Z',
      live: false,
      ended: false,
    };

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) => teamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['wta'],
    });

    expect(market.game).toEqual(
      expect.objectContaining({
        id: '5655456',
        league: 'wta',
        startTime: '2026-05-22T09:00:00Z',
        status: 'scheduled',
        homeTeam: expect.objectContaining({ abbreviation: 'sasnovi' }),
        awayTeam: expect.objectContaining({ abbreviation: 'ribera' }),
      }),
    );
  });

  it('parses ITF game events from provider metadata when league tag is missing', () => {
    const teamsByAbbreviation: Record<string, PolymarketApiTeam> = {
      back: {
        id: 'team-back',
        name: 'Dayeon Back',
        logo: 'back.png',
        abbreviation: 'back',
        color: 'red',
        alias: 'D. Back',
        league: 'itf',
      },
      eunjile: {
        id: 'team-eunjile',
        name: 'Eun Ji Lee',
        logo: 'eunjile.png',
        abbreviation: 'eunjile',
        color: 'orange',
        alias: 'E. Lee',
        league: 'itf',
      },
    };
    const event: PolymarketApiEvent = {
      id: '506396',
      slug: 'itf-back-eunjile-2026-05-21',
      title: 'ITF Changwon: Dayeon Back vs Eun Ji Lee',
      description: 'ITF match',
      icon: 'icon.png',
      closed: false,
      active: true,
      series: [
        {
          id: '11634',
          slug: 'itf',
          title: 'ITF',
          recurrence: 'daily',
        },
      ],
      markets: [
        {
          conditionId: 'condition-1',
          question: 'ITF Changwon: Dayeon Back vs Eun Ji Lee',
          description: 'Market description',
          icon: 'icon.png',
          image: 'image.png',
          groupItemTitle: '',
          groupItemThreshold: 0,
          sportsMarketType: 'moneyline',
          status: 'open',
          volumeNum: 100,
          liquidity: 100,
          negRisk: false,
          clobTokenIds: '["token-back","token-eunjile"]',
          outcomes: '["Dayeon Back","Eun Ji Lee"]',
          outcomePrices: '["0.86","0.14"]',
          closed: false,
          active: true,
          acceptingOrders: true,
          resolvedBy: '',
          orderPriceMinTickSize: 0.01,
          umaResolutionStatus: '',
        },
      ],
      tags: [
        { id: 'tennis', label: 'Tennis', slug: 'tennis' },
        { id: 'games', label: 'Games', slug: 'games' },
      ],
      teams: [teamsByAbbreviation.back, teamsByAbbreviation.eunjile],
      liquidity: 100,
      volume: 100,
      gameId: '1631097223',
      startTime: '2026-05-21T01:00:00Z',
      live: false,
      ended: false,
    };

    const [market] = parsePolymarketEvents([event], {
      category: 'hot',
      teamLookup: (_league, abbreviation) => teamsByAbbreviation[abbreviation],
      extendedSportsMarketsLeagues: ['itf'],
    });

    expect(market.game).toEqual(
      expect.objectContaining({
        id: '1631097223',
        league: 'itf',
        startTime: '2026-05-21T01:00:00Z',
        status: 'scheduled',
        homeTeam: expect.objectContaining({ abbreviation: 'back' }),
        awayTeam: expect.objectContaining({ abbreviation: 'eunjile' }),
      }),
    );
  });

  describe('fetchEventsFromPolymarketApi', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ events: [], next_cursor: null }),
      });
    });

    it('fetches events from keyset endpoint with cursor and without offset', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          events: [{ id: 'event-1' }],
          next_cursor: 'next-cursor',
        }),
      });

      await expect(
        fetchEventsFromPolymarketApi({
          category: 'trending',
          limit: 20,
          afterCursor: 'cursor-1',
        }),
      ).resolves.toEqual({
        events: [{ id: 'event-1' }],
        category: 'trending',
        nextCursor: 'next-cursor',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('https://gamma-api.polymarket.com/events/keyset?');
      expect(url).toContain('after_cursor=cursor-1');
      expect(url).not.toContain('offset=');
    });

    it('uses exact World Cup custom query params without normal feed filters', async () => {
      await fetchEventsFromPolymarketApi({
        category: 'world-cup',
        limit: 20,
        customQueryParams:
          'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events/keyset?limit=20&active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr',
      );
      const requestedUrl = String(mockFetch.mock.calls[0][0]);
      expect(requestedUrl).not.toContain('liquidity_min');
      expect(requestedUrl).not.toContain('volume_min');
      expect(requestedUrl).not.toContain('offset=');
    });

    it('falls back to default World Cup query params without normal feed filters', async () => {
      await fetchEventsFromPolymarketApi({
        category: 'world-cup',
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events/keyset?limit=10&active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr&ascending=false',
      );
      const requestedUrl = String(mockFetch.mock.calls[0][0]);
      expect(requestedUrl).not.toContain('liquidity_min');
      expect(requestedUrl).not.toContain('volume_min');
      expect(requestedUrl).not.toContain('offset=');
    });

    it('uses exact Wimbledon custom query params without normal feed filters', async () => {
      await fetchEventsFromPolymarketApi({
        category: 'wimbledon',
        limit: 20,
        customQueryParams: 'tag_slug=wimbledon&order=volume24hr',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events/keyset?limit=20&tag_slug=wimbledon&order=volume24hr',
      );
      const requestedUrl = String(mockFetch.mock.calls[0][0]);
      expect(requestedUrl).not.toContain('liquidity_min');
      expect(requestedUrl).not.toContain('volume_min');
      expect(requestedUrl).not.toContain('offset=');
    });

    it('falls back to default Wimbledon query params without normal feed filters', async () => {
      await fetchEventsFromPolymarketApi({
        category: 'wimbledon',
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://gamma-api.polymarket.com/events/keyset?limit=10&${PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS}`,
      );
      const requestedUrl = String(mockFetch.mock.calls[0][0]);
      expect(requestedUrl).toContain('tag_id=100639');
      expect(requestedUrl).toContain('tag_slug=tennis');
      expect(requestedUrl).toContain('title_search=Wimbledon');
      expect(requestedUrl).toContain('ended=false');
      expect(requestedUrl).toContain('order=volume24hr');
      expect(requestedUrl).not.toContain('liquidity_min');
      expect(requestedUrl).not.toContain('volume_min');
      expect(requestedUrl).not.toContain('offset=');
    });

    it('keeps Hot category default query on normal feed filters without custom params', async () => {
      await fetchEventsFromPolymarketApi({
        category: 'hot',
        limit: 20,
      });

      const requestedUrl = String(mockFetch.mock.calls[0][0]);
      expect(requestedUrl).toContain('liquidity_min=10000');
      expect(requestedUrl).toContain('volume_min=10000');
      expect(requestedUrl).toContain('order=volume24hr');
      expect(requestedUrl).not.toContain('offset=');
    });

    it('fetches hot custom query events without default filters', async () => {
      await fetchEventsFromPolymarketApi({
        category: 'hot',
        limit: 20,
        customQueryParams: 'tag_id=149&order=volume24hr',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain(
        '/events/keyset?limit=20&tag_id=149&order=volume24hr',
      );
      expect(url).not.toContain('active=true');
      expect(url).not.toContain('offset=');
    });
  });

  describe('buildMarketListQueryParams', () => {
    it('applies open + volume24hr + limit 20 defaults with no params', () => {
      const params = buildMarketListQueryParams();

      expect(params.get('limit')).toBe('20');
      expect(params.get('active')).toBe('true');
      expect(params.get('archived')).toBe('false');
      expect(params.get('closed')).toBe('false');
      expect(params.get('order')).toBe('volume24hr');
      expect(params.get('ascending')).toBe('false');
    });

    it.each([
      ['volume24hr', { order: 'volume24hr', ascending: 'false' }],
      ['liquidity', { order: 'liquidity', ascending: 'false' }],
      ['ending_soon', { order: 'endDate', ascending: 'true' }],
      ['newest', { order: 'startDate', ascending: 'false' }],
    ] as const)('maps order=%s correctly', (order, expected) => {
      const params = buildMarketListQueryParams({ order });

      expect(params.get('order')).toBe(expected.order);
      expect(params.get('ascending')).toBe(expected.ascending);
    });

    it('maps status=open to active/archived/closed flags', () => {
      const params = buildMarketListQueryParams({ status: 'open' });

      expect(params.get('active')).toBe('true');
      expect(params.get('archived')).toBe('false');
      expect(params.get('closed')).toBe('false');
    });

    it.each(['closed', 'resolved'] as const)(
      'maps status=%s to closed=true',
      (status) => {
        const params = buildMarketListQueryParams({ status });

        expect(params.get('closed')).toBe('true');
        expect(params.get('active')).toBeNull();
        expect(params.get('archived')).toBeNull();
      },
    );

    it('appends multiple tags as repeated tag_id params', () => {
      const params = buildMarketListQueryParams({ tags: ['100', '200'] });

      expect(params.getAll('tag_id')).toEqual(['100', '200']);
      expect(params.getAll('tag_slug')).toEqual([]);
    });

    it('appends multiple tagSlugs as repeated tag_slug params', () => {
      const params = buildMarketListQueryParams({ tagSlugs: ['nba', 'nfl'] });

      expect(params.getAll('tag_slug')).toEqual(['nba', 'nfl']);
    });

    it('appends tag_id and tag_slug independently when both are provided', () => {
      const params = buildMarketListQueryParams({
        tags: ['100'],
        tagSlugs: ['politics'],
      });

      expect(params.getAll('tag_id')).toEqual(['100']);
      expect(params.getAll('tag_slug')).toEqual(['politics']);
    });

    it('appends multiple series as repeated series_id params', () => {
      const params = buildMarketListQueryParams({ series: ['10', '20'] });

      expect(params.getAll('series_id')).toEqual(['10', '20']);
    });

    it('sets live=true only when live is requested', () => {
      expect(buildMarketListQueryParams({ live: true }).get('live')).toBe(
        'true',
      );
      expect(
        buildMarketListQueryParams({ live: false }).get('live'),
      ).toBeNull();
      expect(buildMarketListQueryParams().get('live')).toBeNull();
    });

    it('maps afterCursor to after_cursor and respects custom limit', () => {
      const params = buildMarketListQueryParams({
        limit: 50,
        afterCursor: 'cursor-1',
      });

      expect(params.get('limit')).toBe('50');
      expect(params.get('after_cursor')).toBe('cursor-1');
    });

    it('maps search to the title_search param', () => {
      const params = buildMarketListQueryParams({ search: 'bitcoin' });

      expect(params.get('title_search')).toBe('bitcoin');
    });

    it('trims the search value before applying title_search', () => {
      const params = buildMarketListQueryParams({ search: '  bitcoin  ' });

      expect(params.get('title_search')).toBe('bitcoin');
    });

    it.each(['', '   '])(
      'does not set title_search for blank search (%j)',
      (search) => {
        const params = buildMarketListQueryParams({ search });

        expect(params.get('title_search')).toBeNull();
      },
    );

    it('does not set title_search when search is omitted', () => {
      const params = buildMarketListQueryParams();

      expect(params.get('title_search')).toBeNull();
    });
  });

  describe('fetchMarketsFromPolymarketApi', () => {
    it('hits the keyset endpoint and normalizes next_cursor to nextCursor', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          events: [{ id: 'event-1' }],
          next_cursor: 'next-cursor',
        }),
      });

      await expect(
        fetchMarketsFromPolymarketApi({ order: 'liquidity', limit: 5 }),
      ).resolves.toEqual({
        events: [{ id: 'event-1' }],
        nextCursor: 'next-cursor',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('https://gamma-api.polymarket.com/events/keyset?');
      expect(url).toContain('order=liquidity');
      expect(url).toContain('limit=5');
    });

    it('defaults nextCursor to null when absent', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ events: [] }),
      });

      await expect(fetchMarketsFromPolymarketApi()).resolves.toEqual({
        events: [],
        nextCursor: null,
      });
    });

    it('throws when the response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(fetchMarketsFromPolymarketApi()).rejects.toThrow(
        'Failed to list markets',
      );
    });

    it('throws when events are malformed', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ events: null }),
      });

      await expect(fetchMarketsFromPolymarketApi()).rejects.toThrow(
        'Malformed keyset events response',
      );
    });
  });

  describe('fetchRelatedTagsFromPolymarketApi', () => {
    it('builds the related-tags endpoint URL for the general "all" root', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([{ id: '1', slug: 'nba' }]),
      });

      await expect(fetchRelatedTagsFromPolymarketApi('all')).resolves.toEqual([
        { id: '1', slug: 'nba' },
      ]);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://gamma-api.polymarket.com/tags/slug/all/related-tags/tags?omit_empty=true&status=active',
      );
    });

    it('builds the URL for a feed-specific slug such as politics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await fetchRelatedTagsFromPolymarketApi('politics');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://gamma-api.polymarket.com/tags/slug/politics/related-tags/tags?omit_empty=true&status=active',
      );
    });

    it('url-encodes the slug', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await fetchRelatedTagsFromPolymarketApi('march madness');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/tags/slug/march%20madness/related-tags/tags');
    });

    it('throws when the response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await expect(fetchRelatedTagsFromPolymarketApi('all')).rejects.toThrow(
        'Failed to fetch related tags',
      );
    });

    it('throws when the payload is not an array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ tags: [] }),
      });

      await expect(fetchRelatedTagsFromPolymarketApi('all')).rejects.toThrow(
        'Malformed related-tags response',
      );
    });
  });

  describe('normalizeRelatedTagsToFilterOptions', () => {
    it('normalizes each tag into a slug-based filter option with ready params', () => {
      const result = normalizeRelatedTagsToFilterOptions(
        [
          { id: '1', label: 'NBA', slug: 'nba' },
          { id: '2', label: 'NFL', slug: 'nfl' },
        ],
        { source: 'hot-tags' },
      );

      expect(result).toEqual([
        {
          id: 'nba',
          label: 'NBA',
          source: 'hot-tags',
          params: { tagSlugs: ['nba'], order: 'volume24hr', status: 'open' },
        },
        {
          id: 'nfl',
          label: 'NFL',
          source: 'hot-tags',
          params: { tagSlugs: ['nfl'], order: 'volume24hr', status: 'open' },
        },
      ]);
    });

    it('merges baseParams into each option params', () => {
      const [option] = normalizeRelatedTagsToFilterOptions(
        [{ id: '1', label: 'NBA', slug: 'nba' }],
        {
          source: 'hot-tags',
          baseParams: { tagSlugs: ['sports'], live: true },
        },
      );

      // tagSlugs is overridden with the option's own slug; other base params kept.
      expect(option.params).toEqual({
        tagSlugs: ['nba'],
        live: true,
        order: 'volume24hr',
        status: 'open',
      });
    });

    it('never leaks a pagination cursor (afterCursor) from baseParams into option params', () => {
      const [option] = normalizeRelatedTagsToFilterOptions(
        [{ id: '1', label: 'NBA', slug: 'nba' }],
        {
          source: 'hot-tags',
          baseParams: { live: true, afterCursor: 'cursor-123' },
        },
      );

      expect(option.params).not.toHaveProperty('afterCursor');
      expect(option.params).toEqual({
        order: 'volume24hr',
        status: 'open',
        live: true,
        tagSlugs: ['nba'],
      });
    });

    it('lets baseParams override the default order/status, but never tagSlugs', () => {
      const [option] = normalizeRelatedTagsToFilterOptions(
        [{ id: '1', label: 'NBA', slug: 'nba' }],
        {
          source: 'hot-tags',
          baseParams: {
            order: 'newest',
            status: 'closed',
            tagSlugs: ['sports'],
          },
        },
      );

      expect(option.params).toEqual({
        order: 'newest',
        status: 'closed',
        tagSlugs: ['nba'],
      });
    });

    it('falls back to the slug when label is missing/blank', () => {
      const [option] = normalizeRelatedTagsToFilterOptions(
        [{ id: '1', label: '  ', slug: 'nba' }],
        { source: 'hot-tags' },
      );

      expect(option.label).toBe('nba');
    });

    it('dedupes by slug (id), keeping the first occurrence', () => {
      const result = normalizeRelatedTagsToFilterOptions(
        [
          { id: '1', label: 'NBA', slug: 'nba' },
          { id: '2', label: 'NBA dup', slug: 'nba' },
        ],
        { source: 'hot-tags' },
      );

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('NBA');
    });

    it('drops options whose slug is in existingIds (static-vs-dynamic dedupe)', () => {
      const result = normalizeRelatedTagsToFilterOptions(
        [
          { id: '1', label: 'Politics', slug: 'politics' },
          { id: '2', label: 'NBA', slug: 'nba' },
        ],
        { source: 'hot-tags', existingIds: ['politics'] },
      );

      expect(result.map((o) => o.id)).toEqual(['nba']);
    });

    it('skips tags with missing/blank slugs', () => {
      const result = normalizeRelatedTagsToFilterOptions(
        [
          { id: '1', label: 'No slug', slug: '' },
          { id: '2', label: 'NBA', slug: 'nba' },
        ],
        { source: 'hot-tags' },
      );

      expect(result.map((o) => o.id)).toEqual(['nba']);
    });

    it('respects limit', () => {
      const result = normalizeRelatedTagsToFilterOptions(
        [
          { id: '1', label: 'NBA', slug: 'nba' },
          { id: '2', label: 'NFL', slug: 'nfl' },
          { id: '3', label: 'NHL', slug: 'nhl' },
        ],
        { source: 'hot-tags', limit: 2 },
      );

      expect(result.map((o) => o.id)).toEqual(['nba', 'nfl']);
    });

    it('returns an empty list when limit is 0', () => {
      expect(
        normalizeRelatedTagsToFilterOptions(
          [
            { id: '1', label: 'NBA', slug: 'nba' },
            { id: '2', label: 'NFL', slug: 'nfl' },
          ],
          { source: 'hot-tags', limit: 0 },
        ),
      ).toEqual([]);
    });

    it('returns an empty list for empty input', () => {
      expect(
        normalizeRelatedTagsToFilterOptions([], { source: 'hot-tags' }),
      ).toEqual([]);
    });
  });

  it('searches events via public-search endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        events: [{ id: 'event-1' }],
        pagination: { totalResults: 1 },
      }),
    });

    await expect(
      searchEventsFromPolymarketApi({ q: 'bitcoin', limit: 10, page: 2 }),
    ).resolves.toEqual({ events: [{ id: 'event-1' }], totalResults: 1 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('https://gamma-api.polymarket.com/public-search?');
    expect(url).toContain('q=bitcoin');
    expect(url).toContain('limit_per_type=10');
    expect(url).toContain('page=2');
  });

  it('fetches child events from keyset endpoint with bounded limit', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ events: [{ id: 'child-1' }] }),
    });

    await expect(
      fetchChildEventsFromGammaApi({ parentEventId: 'parent-1' }),
    ).resolves.toEqual([{ id: 'child-1' }]);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('https://gamma-api.polymarket.com/events/keyset?');
    expect(url).toContain('parent_event_id=parent-1');
    expect(url).toContain('include_children=true');
    expect(url).toContain('limit=100');
    expect(url).not.toContain('offset=');
  });

  it('creates API keys against the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(apiKeyCreds),
      text: jest.fn().mockResolvedValue(JSON.stringify(apiKeyCreds)),
    });

    await expect(
      createApiKey({ address: '0x1111111111111111111111111111111111111111' }),
    ).resolves.toEqual(apiKeyCreds);

    expect(mockSignTypedMessage).toHaveBeenCalledWith(
      expect.any(Object),
      SignTypedDataVersion.V4,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/auth/api-key`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('derives API keys against the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue(apiKeyCreds),
      text: jest.fn().mockResolvedValue(JSON.stringify(apiKeyCreds)),
    });

    await expect(
      deriveApiKey({ address: '0x1111111111111111111111111111111111111111' }),
    ).resolves.toEqual(apiKeyCreds);

    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/auth/derive-api-key`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('falls back to deriving an API key when creation returns 400', async () => {
    mockFetch
      .mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: jest.fn(),
        text: jest.fn().mockResolvedValue('Bad Request'),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue(apiKeyCreds),
        text: jest.fn().mockResolvedValue(JSON.stringify(apiKeyCreds)),
      });

    await expect(
      createApiKey({ address: '0x1111111111111111111111111111111111111111' }),
    ).resolves.toEqual(apiKeyCreds);

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${DEFAULT_CLOB_BASE_URL}/auth/api-key`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${DEFAULT_CLOB_BASE_URL}/auth/derive-api-key`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fetches order books from the canonical CLOB host', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(orderBook),
    });

    await expect(getOrderBook({ tokenId: 'token-1' })).resolves.toEqual(
      orderBook,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/book?token_id=token-1`,
      { method: 'GET' },
    );
  });

  it('maps missing order book errors to the Predict preview error code', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'No orderbook exists for the requested token id',
      }),
    });

    await expect(getOrderBook({ tokenId: 'token-1' })).rejects.toThrow(
      PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK,
    );
  });

  describe('getTickSizeRoundConfig', () => {
    it('uses explicit rounding config for documented 0.0025 tick size', () => {
      expect(getTickSizeRoundConfig({ tickSize: '0.0025' })).toEqual({
        tickSize: '0.0025',
        roundConfig: {
          price: 4,
          size: 2,
          amount: 6,
        },
      });
    });

    it('derives rounding config for valid tick sizes not in the static config', () => {
      expect(getTickSizeRoundConfig({ tickSize: '0.005' })).toEqual({
        tickSize: '0.005',
        roundConfig: {
          price: 3,
          size: 2,
          amount: 5,
        },
      });
    });

    it('normalizes scientific notation tick sizes before deriving config', () => {
      expect(getTickSizeRoundConfig({ tickSize: 1e-6 })).toEqual({
        tickSize: '0.000001',
        roundConfig: {
          price: 6,
          size: 2,
          amount: 6,
        },
      });
    });

    it.each([undefined, null, 0, -0.01, 1, Number.NaN, Infinity, 'invalid'])(
      'throws for invalid tick size %p',
      (tickSize) => {
        expect(() => getTickSizeRoundConfig({ tickSize })).toThrow(
          'Invalid Polymarket tick size',
        );
      },
    );
  });

  it('fetches CLOB market info and caches by condition ID', async () => {
    const marketInfo = {
      fd: {
        r: 0.02,
        e: 1,
        to: true,
      },
      mts: 1,
      mos: 1,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(marketInfo),
    });

    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).resolves.toEqual(marketInfo);
    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).resolves.toEqual(marketInfo);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/clob-markets/condition-1`,
      { method: 'GET' },
    );
  });

  it('rejects invalid CLOB market info responses without caching', async () => {
    const validMarketInfo = {
      fd: {
        r: 0.02,
        e: 1,
        to: true,
      },
      mts: 1,
      mos: 1,
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: 'invalid',
          mts: '1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(validMarketInfo),
      });

    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).rejects.toThrow('Invalid CLOB market info response');
    await expect(
      getClobMarketInfo({ conditionId: 'condition-1' }),
    ).resolves.toEqual(validMarketInfo);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('logs CLOB market info failures once per condition ID and fails open', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();
    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          feature: 'Predict',
          provider: 'polymarket',
        }),
        context: expect.objectContaining({
          name: 'PolymarketUtils',
          data: expect.objectContaining({
            method: 'getClobMarketInfo',
            conditionId: 'condition-1',
          }),
        }),
      }),
    );
  });

  it('clears CLOB market info failure suppression after a later success', async () => {
    const marketInfo = {
      fd: {
        r: 0.02,
        e: 1,
        to: true,
      },
    };

    mockFetch
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(marketInfo),
      })
      .mockRejectedValueOnce(new Error('network down again'));

    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();
    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toEqual(marketInfo);

    clearClobMarketInfoCache();

    await expect(
      getClobMarketInfoSafe({ conditionId: 'condition-1' }),
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });

  describe('calculateConservativeBuyMarketFee', () => {
    it('uses endpoint maximum when no interior critical point is in the interval', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.02,
              e: 1,
            },
          },
        }),
      ).toBe(0.1);
    });

    it('uses the interior critical point when it is inside the interval', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: {
            ...buyPreview,
            minAmountReceived: 50,
            slippage: 0.5,
          },
          marketInfo: {
            fd: {
              r: 0.02,
              e: 2,
            },
          },
        }),
      ).toBe(0.02963);
    });

    it('treats exponent zero as valid', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.02,
              e: 0,
            },
          },
        }),
      ).toBe(0.4);
    });

    it('returns zero when the fee rate is zero', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });

    it('returns zero for invalid fee metadata', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.02,
              e: -1,
            },
          },
        }),
      ).toBe(0);
    });

    it('returns zero when the buy interval cannot be derived', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: {
            ...buyPreview,
            minAmountReceived: 0,
          },
          marketInfo: {
            fd: {
              r: 0.02,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });

    it('rounds the market fee to five decimals', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.0246912,
              e: 1,
            },
          },
        }),
      ).toBe(0.12346);
    });

    it('rounds values below half of the smallest unit to zero', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: buyPreview,
          marketInfo: {
            fd: {
              r: 0.0000008,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });

    it('returns zero for SELL previews', () => {
      expect(
        calculateConservativeBuyMarketFee({
          preview: {
            ...buyPreview,
            side: Side.SELL,
          },
          marketInfo: {
            fd: {
              r: 0.02,
              e: 1,
            },
          },
        }),
      ).toBe(0);
    });
  });

  it('previews buy orders with CLOB market fee and zero fee-rate bps', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(orderBook),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: {
            r: 0.02,
            e: 1,
            to: true,
          },
        }),
      });

    const preview = await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.BUY,
      size: 10,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        marketId: 'market-1',
        outcomeTokenId: 'token-1',
        feeRateBps: '0',
        fees: expect.objectContaining({
          marketFee: 0.1,
          totalFee: 0,
          totalFeePercentage: 0,
        }),
        negRisk: false,
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/clob-markets/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      { method: 'GET' },
    );
  });

  it('previews buy orders with 0.0025 tick size from ROUNDING_CONFIG', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ...orderBook,
          tick_size: '0.0025',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: {
            r: 0.02,
            e: 1,
            to: true,
          },
        }),
      });

    const preview = await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.BUY,
      size: 10,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        tickSize: 0.0025,
        maxAmountSpent: 10,
        minAmountReceived: 20,
      }),
    );
  });

  it('previews buy orders with runtime CLOB tick sizes outside the legacy config', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ...orderBook,
          tick_size: '0.005',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: {
            r: 0.02,
            e: 1,
            to: true,
          },
        }),
      });

    const preview = await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.BUY,
      size: 10,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        tickSize: 0.005,
        maxAmountSpent: 10,
        minAmountReceived: 20,
      }),
    );
  });

  it('uses v2 CLOB endpoint for buy preview order book and market info', async () => {
    const v2ClobBaseUrl = 'https://clob-v2.example.com';
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(orderBook),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          fd: {
            r: 0.02,
            e: 1,
            to: true,
          },
        }),
      });

    await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.BUY,
      size: 10,
      isV2: true,
      clobBaseUrl: v2ClobBaseUrl,
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `${v2ClobBaseUrl}/book?token_id=token-1`,
      { method: 'GET' },
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `${v2ClobBaseUrl}/clob-markets/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      { method: 'GET' },
    );
  });

  it('does not fetch CLOB market info for sell previews', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(orderBook),
    });

    const preview = await previewOrder({
      marketId: 'market-1',
      outcomeId:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      outcomeTokenId: 'token-1',
      side: Side.SELL,
      size: 10,
    });

    expect(preview).toEqual(
      expect.objectContaining({
        marketId: 'market-1',
        outcomeTokenId: 'token-1',
        feeRateBps: '0',
        side: Side.SELL,
      }),
    );
    expect(preview.fees).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${DEFAULT_CLOB_BASE_URL}/book?token_id=token-1`,
      { method: 'GET' },
    );
  });

  it('returns the v2 contract config for Polygon', () => {
    expect(getContractConfig(POLYGON_MAINNET_CHAIN_ID)).toBe(
      MATIC_CONTRACTS_V2,
    );
  });

  it('treats empty balance results as zero', async () => {
    mockQuery.mockResolvedValue('0x');

    await expect(
      getRawBalance({
        address: '0x1111111111111111111111111111111111111111',
        tokenAddress: '0x2222222222222222222222222222222222222222',
      }),
    ).resolves.toBe(0n);

    expect(mockEthQuery).toHaveBeenCalled();
  });

  it('treats empty allowance results as zero', async () => {
    mockQuery.mockResolvedValue('0x');

    await expect(
      getAllowance({
        tokenAddress: '0x2222222222222222222222222222222222222222',
        owner: '0x1111111111111111111111111111111111111111',
        spender: '0x3333333333333333333333333333333333333333',
      }),
    ).resolves.toBe(0n);
  });

  it('treats empty approval results as false', async () => {
    mockQuery.mockResolvedValue('0x');

    await expect(
      getIsApprovedForAll({
        tokenAddress: '0x2222222222222222222222222222222222222222',
        owner: '0x1111111111111111111111111111111111111111',
        operator: '0x3333333333333333333333333333333333333333',
      }),
    ).resolves.toBe(false);
  });

  it('preserves parent market id when parsing Polymarket events', () => {
    const event: PolymarketApiEvent = {
      id: 'child-event',
      slug: 'child-event',
      title: 'Child Event',
      description: 'Child event description',
      icon: '',
      closed: false,
      series: [],
      markets: [],
      tags: [],
      liquidity: 0,
      volume: 0,
      parentEventId: 'parent-market',
    };

    expect(parsePolymarketEvents([event], 'trending')).toEqual([
      expect.objectContaining({
        id: 'child-event',
        parentMarketId: 'parent-market',
      }),
    ]);
  });

  it('falls back to question when a spread market is missing group item title', () => {
    const marketWithoutGroupItemTitle = {
      conditionId: 'spread-condition',
      question: 'Knicks -3.5',
      description: 'Spread market',
      icon: 'icon.png',
      image: 'image.png',
      sportsMarketType: 'spreads',
      status: 'open',
      volumeNum: 100,
      liquidity: 100,
      negRisk: false,
      clobTokenIds: '["token-knicks","token-spurs"]',
      outcomes: '["NYK","SAS"]',
      outcomePrices: '["0.5","0.5"]',
      closed: false,
      active: true,
      acceptingOrders: true,
      resolvedBy: '',
      orderPriceMinTickSize: 0.01,
      umaResolutionStatus: '',
      line: -3.5,
    } as unknown as PolymarketApiEvent['markets'][number];
    const event: PolymarketApiEvent = {
      id: 'spread-event',
      slug: 'knicks-vs-spurs',
      title: 'Knicks vs. Spurs',
      description: 'Game description',
      icon: 'icon.png',
      closed: false,
      active: true,
      series: [],
      markets: [marketWithoutGroupItemTitle],
      tags: [],
      liquidity: 100,
      volume: 100,
    };

    expect(() => parsePolymarketEvents([event], 'sports')).not.toThrow();

    const [parsedMarket] = parsePolymarketEvents([event], 'sports');

    expect(parsedMarket.outcomes[0].groupItemTitle).toBe('Knicks 3.5');
  });

  it('parses crypto up/down price to beat from event metadata', () => {
    const event: PolymarketApiEvent = {
      id: 'crypto-event',
      slug: 'bitcoin-up-or-down-may-26-2026-7pm-et',
      title: 'Bitcoin Up or Down - May 26, 7PM ET',
      description: 'Description',
      icon: '',
      closed: false,
      active: true,
      series: [
        {
          id: '10114',
          slug: 'btc-up-or-down-hourly',
          title: 'BTC Up or Down Hourly',
          recurrence: 'hourly',
        },
      ],
      markets: [],
      tags: [
        { id: 'crypto', label: 'Crypto', slug: 'crypto' },
        { id: 'up-or-down', label: 'Up or Down', slug: 'up-or-down' },
      ],
      liquidity: 0,
      volume: 0,
      eventMetadata: {
        priceToBeat: 75749.02,
      },
    };

    expect(parsePolymarketEvents([event], 'crypto')).toEqual([
      expect.objectContaining({
        id: 'crypto-event',
        priceToBeat: 75749.02,
      }),
    ]);
  });
});
