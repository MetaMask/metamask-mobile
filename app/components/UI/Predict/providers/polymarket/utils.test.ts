import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { Side, type OrderPreview, type PredictOutcome } from '../../types';
import { PREDICT_ERROR_CODES } from '../../constants/errors';
import { getSportsMarketTypeGroupKey } from '../../constants/sports';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
} from './constants';
import {
  buildMarketListQueryParams,
  buildOutcomeGroups,
  getOutcomeSubject,
  calculateConservativeBuyMarketFee,
  clearClobMarketInfoCache,
  clearClobMarketInfoSessionState,
  createApiKey,
  deriveApiKey,
  fetchChildEventsFromGammaApi,
  fetchEventsFromPolymarketApi,
  fetchMarketsFromPolymarketApi,
  filterSupportedSportsOutcomes,
  fetchRelatedTagsFromPolymarketApi,
  normalizeRelatedTagsToFilterOptions,
  getAllowance,
  getClobMarketInfo,
  getClobMarketInfoSafe,
  getContractConfig,
  getIsApprovedForAll,
  logUnsupportedSportsMarketTypesOnce,
  getOrderBook,
  getRawBalance,
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

  it('groups tennis first set markets separately from game lines', () => {
    const createOutcome = (
      id: string,
      sportsMarketType: string,
    ): PredictOutcome => ({
      id,
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: id,
      description: id,
      image: 'icon.png',
      status: 'open',
      tokens: [{ id: `${id}-token`, title: 'Yes', price: 0.5 }],
      volume: 100,
      groupItemTitle: id,
      sportsMarketType,
    });

    const groups = buildOutcomeGroups([
      createOutcome('moneyline', 'moneyline'),
      createOutcome('set-total', 'tennis_set_totals'),
      createOutcome('match-total', 'tennis_match_totals'),
      createOutcome('completed', 'tennis_completed_match'),
      createOutcome('first-set-winner', 'tennis_first_set_winner'),
      createOutcome('first-set-total', 'tennis_first_set_totals'),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      'game_lines',
      'first_set',
    ]);
    expect(groups[0].subgroups?.map((group) => group.key)).toEqual([
      'moneyline',
      'tennis_set_totals',
      'tennis_match_totals',
      'tennis_completed_match',
    ]);
    expect(groups[1].subgroups?.map((group) => group.key)).toEqual([
      'tennis_first_set_winner',
      'tennis_first_set_totals',
    ]);
  });

  describe('buildOutcomeGroups soccer grouping', () => {
    const mkOutcome = (
      sportsMarketType: string,
      groupItemTitle: string,
      extra: Partial<PredictOutcome> = {},
    ): PredictOutcome => ({
      id: extra.id ?? `${sportsMarketType}-${groupItemTitle}`,
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: groupItemTitle,
      description: groupItemTitle,
      image: 'icon.png',
      status: 'open',
      tokens: [
        { id: `${groupItemTitle}-over`, title: 'Over', price: 0.5 },
        { id: `${groupItemTitle}-under`, title: 'Under', price: 0.5 },
      ],
      volume: 100,
      groupItemTitle,
      sportsMarketType,
      ...extra,
    });

    const teamTotals = [
      mkOutcome('soccer_team_totals', 'Mexico O/U 0.5', { line: 0.5 }),
      mkOutcome('soccer_team_totals', 'Mexico O/U 1.5', { line: 1.5 }),
      mkOutcome('soccer_team_totals', 'South Africa O/U 0.5', { line: 0.5 }),
      mkOutcome('soccer_team_totals', 'South Africa O/U 1.5', { line: 1.5 }),
    ];

    it('derives group keys for new player stat market types', () => {
      expect(getSportsMarketTypeGroupKey('soccer_player_goals')).toBe('goals');
      expect(getSportsMarketTypeGroupKey('soccer_player_shots_on_target')).toBe(
        'shots_on_target',
      );
      expect(
        getSportsMarketTypeGroupKey('soccer_player_goals_plus_assists'),
      ).toBe('goals_plus_assists');
      expect(
        getSportsMarketTypeGroupKey('soccer_player_goalkeeper_saves'),
      ).toBe('goalkeeper_saves');
      expect(getSportsMarketTypeGroupKey('totals')).toBe('game_lines');
    });

    it('assigns soccer market types to the expected tabs in order', () => {
      const groups = buildOutcomeGroups([
        mkOutcome('moneyline', 'Mexico'),
        mkOutcome('total_corners', 'Total Corners: O/U 8.5', { line: 8.5 }),
        mkOutcome('soccer_player_goals', 'Player A: 1+ goals', { line: 0.5 }),
        mkOutcome('soccer_player_assists', 'Player A: 1+ assists', {
          line: 0.5,
        }),
        mkOutcome('soccer_player_shots', 'Player A: 1+ shots', { line: 0.5 }),
        mkOutcome(
          'soccer_player_goals_plus_assists',
          'Player A: 1+ goals + assists',
          {
            line: 0.5,
          },
        ),
        mkOutcome(
          'soccer_player_shots_on_target',
          'Player A: 1+ shots on target',
          {
            line: 0.5,
          },
        ),
        mkOutcome('soccer_player_goalkeeper_saves', 'Keeper A: 2+ saves', {
          line: 1.5,
        }),
        mkOutcome('soccer_exact_score', 'Mexico 1 - 0 South Africa'),
        mkOutcome('soccer_halftime_result', 'Mexico'),
        mkOutcome('soccer_second_half_result', 'Mexico'),
        mkOutcome('first_half_totals', '1st Half O/U 1.5', { line: 1.5 }),
        mkOutcome('second_half_totals', '2nd Half O/U 1.5', { line: 1.5 }),
      ]);

      expect(groups.map((g) => g.key)).toEqual([
        'game_lines',
        'first_half',
        'second_half',
        'exact_score',
        'halftime',
        'corners',
        'goals',
        'goals_plus_assists',
        'assists',
        'shots',
        'shots_on_target',
        'goalkeeper_saves',
      ]);
    });

    it('filters unsupported market types before building groups', () => {
      const groups = buildOutcomeGroups([
        mkOutcome('moneyline', 'Mexico'),
        mkOutcome('basketball_player_blocks', 'Player A: 2+ blocks', {
          line: 1.5,
        }),
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0].key).toBe('game_lines');
      expect(groups[0].subgroups?.map((group) => group.key)).toEqual([
        'moneyline',
      ]);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Unsupported Predict sports market type: basketball_player_blocks',
        }),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              method: 'logUnsupportedSportsMarketTypesOnce',
              sportsMarketType: 'basketball_player_blocks',
              droppedOutcomeCount: 1,
            }),
          }),
        }),
      );
    });

    it('returns filtered and unsupported outcomes from the shared helper', () => {
      const { filteredOutcomes, unsupportedOutcomes } =
        filterSupportedSportsOutcomes([
          mkOutcome('moneyline', 'Mexico'),
          mkOutcome('basketball_player_blocks', 'Player A: 2+ blocks', {
            line: 1.5,
          }),
          mkOutcome('basketball_player_blocks', 'Player B: 3+ blocks', {
            line: 2.5,
          }),
        ]);

      expect(
        filteredOutcomes.map((outcome) => outcome.sportsMarketType),
      ).toEqual(['moneyline']);
      expect([...unsupportedOutcomes.entries()]).toEqual([
        ['basketball_player_blocks', 2],
      ]);
    });

    it('splits team totals into one card per team', () => {
      const [gameLines] = buildOutcomeGroups(teamTotals);
      const card = gameLines.subgroups?.find((s) =>
        s.key.startsWith('soccer_team_totals'),
      );
      // Two distinct teams -> two cards.
      const teamCards = gameLines.subgroups?.filter((s) =>
        s.key.startsWith('soccer_team_totals'),
      );
      expect(teamCards).toHaveLength(2);
      expect(teamCards?.map((s) => s.title).sort()).toEqual([
        'Mexico Totals',
        'South Africa Totals',
      ]);
      // Each team card has its two lines.
      expect(card?.outcomes).toHaveLength(2);
      expect(teamCards?.[0].key).toBe('soccer_team_totals-0');
      expect(teamCards?.[1].key).toBe('soccer_team_totals-1');
    });

    it('splits player props into one card per player titled by name', () => {
      const [goals] = buildOutcomeGroups([
        mkOutcome('soccer_player_goals', 'Armando González: 1+ goals', {
          line: 0.5,
        }),
        mkOutcome('soccer_player_goals', 'Armando González: 2+ goals', {
          line: 1.5,
        }),
        mkOutcome('soccer_player_goals', 'Gilberto Mora: 1+ goals', {
          line: 0.5,
        }),
      ]);

      expect(goals.key).toBe('goals');
      expect(goals.subgroups).toHaveLength(2);
      expect(goals.subgroups?.map((s) => s.title)).toEqual([
        'Armando González',
        'Gilberto Mora',
      ]);
      // The player with two lines keeps both outcomes in one card.
      expect(goals.subgroups?.[0].outcomes).toHaveLength(2);
      expect(goals.subgroups?.[1].outcomes).toHaveLength(1);
    });

    it('splits generic player stat tabs by player while keeping each player lines together', () => {
      const [shotsOnTarget] = buildOutcomeGroups([
        mkOutcome(
          'soccer_player_shots_on_target',
          'Armando González: 1+ shots on target',
          {
            line: 0.5,
          },
        ),
        mkOutcome(
          'soccer_player_shots_on_target',
          'Armando González: 2+ shots on target',
          {
            line: 1.5,
          },
        ),
        mkOutcome(
          'soccer_player_shots_on_target',
          'Gilberto Mora: 1+ shots on target',
          {
            line: 0.5,
          },
        ),
      ]);

      expect(shotsOnTarget.key).toBe('shots_on_target');
      expect(shotsOnTarget.subgroups?.map((s) => s.title)).toEqual([
        'Armando González',
        'Gilberto Mora',
      ]);
      expect(shotsOnTarget.subgroups?.[0].outcomes).toHaveLength(2);
      expect(shotsOnTarget.subgroups?.[1].outcomes).toHaveLength(1);
    });

    it('keeps a single-subject line market (corners) as one untitled card', () => {
      const [corners] = buildOutcomeGroups([
        mkOutcome('total_corners', 'Total Corners: O/U 8.5', { line: 8.5 }),
        mkOutcome('total_corners', 'Total Corners: O/U 9.5', { line: 9.5 }),
      ]);

      expect(corners.key).toBe('corners');
      expect(corners.subgroups).toHaveLength(1);
      expect(corners.subgroups?.[0].key).toBe('total_corners');
      expect(corners.subgroups?.[0].outcomes).toHaveLength(2);
      // No title -> the view derives the market-type label.
      expect(corners.subgroups?.[0].title).toBeUndefined();
    });

    it('renders one card per outcome for exact score', () => {
      const [exactScore] = buildOutcomeGroups([
        mkOutcome('soccer_exact_score', 'Mexico 1 - 0 South Africa'),
        mkOutcome('soccer_exact_score', 'Mexico 2 - 1 South Africa'),
        mkOutcome('soccer_exact_score', 'Mexico 0 - 0 South Africa'),
      ]);

      expect(exactScore.key).toBe('exact_score');
      expect(exactScore.subgroups).toHaveLength(3);
      expect(exactScore.subgroups?.every((s) => s.outcomes.length === 1)).toBe(
        true,
      );
      expect(exactScore.subgroups?.map((s) => s.key)).toEqual([
        'soccer_exact_score-0',
        'soccer_exact_score-1',
        'soccer_exact_score-2',
      ]);
      // Individual markets carry their own title (not the market-type label).
      expect(exactScore.subgroups?.map((s) => s.title)).toEqual([
        'Mexico 1 - 0 South Africa',
        'Mexico 2 - 1 South Africa',
        'Mexico 0 - 0 South Africa',
      ]);
    });

    it('keeps a two-way moneyline as one untitled (type-labelled) card', () => {
      // A single head-to-head market (tennis / baseball) is one outcome with two
      // tokens. It must stay one aggregate card with no title so the view labels
      // it by market type ("Moneyline").
      const [gameLines] = buildOutcomeGroups([
        mkOutcome('moneyline', 'Snigur vs Udvardy', {
          tokens: [
            { id: 'a', title: 'Snigur', price: 0.32 },
            { id: 'b', title: 'Udvardy', price: 0.68 },
          ],
        }),
      ]);

      expect(gameLines.subgroups).toHaveLength(1);
      expect(gameLines.subgroups?.[0].key).toBe('moneyline');
      expect(gameLines.subgroups?.[0].outcomes).toHaveLength(1);
      expect(gameLines.subgroups?.[0].title).toBeUndefined();
    });

    it('keeps game totals as one untitled card even when titles embed the matchup', () => {
      // NHL totals fall back to the question for their title, e.g.
      // "Golden Knights vs. Hurricanes: O/U 3.5". They must not be split by the
      // matchup name — the view labels the single card "Totals".
      const [gameLines] = buildOutcomeGroups([
        mkOutcome('totals', 'Golden Knights vs. Hurricanes: O/U 3.5', {
          line: 3.5,
        }),
        mkOutcome('totals', 'O/U 4.5', { line: 4.5 }),
        mkOutcome('totals', 'Golden Knights vs. Hurricanes: O/U 5.5', {
          line: 5.5,
        }),
      ]);

      const totalsCards = gameLines.subgroups?.filter(
        (s) => s.outcomes[0]?.sportsMarketType === 'totals',
      );
      expect(totalsCards).toHaveLength(1);
      expect(totalsCards?.[0].key).toBe('totals');
      expect(totalsCards?.[0].outcomes).toHaveLength(3);
      expect(totalsCards?.[0].title).toBeUndefined();
    });

    it('splits NBA player props (points) into one card per player', () => {
      const [points] = buildOutcomeGroups([
        mkOutcome('points', 'Victor Wembanyama: Points O/U 27.5', {
          line: 27.5,
        }),
        mkOutcome('points', 'Jalen Brunson: Points O/U 26.5', { line: 26.5 }),
      ]);

      expect(points.key).toBe('points');
      expect(points.subgroups?.map((s) => s.title)).toEqual([
        'Victor Wembanyama',
        'Jalen Brunson',
      ]);
    });

    it('keeps multi-word player O/U stat lines grouped under one player card', () => {
      const [shotsOnTarget] = buildOutcomeGroups([
        mkOutcome(
          'soccer_player_shots_on_target',
          'Alexis Vega: Shots on Target O/U 1.5',
          {
            line: 1.5,
          },
        ),
        mkOutcome(
          'soccer_player_shots_on_target',
          'Alexis Vega: Shots on Target O/U 2.5',
          {
            line: 2.5,
          },
        ),
        mkOutcome(
          'soccer_player_shots_on_target',
          'Brian Gutiérrez: Shots on Target O/U 0.5',
          {
            line: 0.5,
          },
        ),
      ]);

      expect(shotsOnTarget.key).toBe('shots_on_target');
      expect(shotsOnTarget.subgroups?.map((s) => s.title)).toEqual([
        'Alexis Vega',
        'Brian Gutiérrez',
      ]);
      expect(shotsOnTarget.subgroups?.[0].outcomes).toHaveLength(2);
      expect(shotsOnTarget.subgroups?.[1].outcomes).toHaveLength(1);
    });

    it('keeps moneyline-like second half result as a single card in the second half tab', () => {
      const [secondHalf] = buildOutcomeGroups([
        mkOutcome('soccer_second_half_result', 'Mexico'),
        mkOutcome('soccer_second_half_result', 'Draw'),
        mkOutcome('soccer_second_half_result', 'South Africa'),
      ]);

      expect(secondHalf.key).toBe('second_half');
      expect(secondHalf.subgroups).toHaveLength(1);
      expect(secondHalf.subgroups?.[0].key).toBe('soccer_second_half_result');
      expect(secondHalf.subgroups?.[0].outcomes).toHaveLength(3);
    });

    it('does not split spreads', () => {
      const [gameLines] = buildOutcomeGroups([
        mkOutcome('spreads', 'Mexico (-1.5)', { line: -1.5 }),
        mkOutcome('spreads', 'South Africa (-1.5)', { line: -1.5 }),
      ]);

      const spreadCards = gameLines.subgroups?.filter(
        (s) => s.key === 'spreads',
      );
      expect(spreadCards).toHaveLength(1);
      expect(spreadCards?.[0].outcomes).toHaveLength(2);
    });

    it('groups every corner market type into the corners tab', () => {
      const groups = buildOutcomeGroups([
        mkOutcome('total_corners', 'Total Corners: O/U 8.5', { line: 8.5 }),
        mkOutcome('soccer_team_total_corners', 'Mexico Corners: O/U 4.5', {
          line: 4.5,
        }),
        mkOutcome(
          'soccer_first_half_total_corners',
          '1st Half Total Corners: O/U 5.5',
          { line: 5.5 },
        ),
        mkOutcome(
          'soccer_second_half_total_corners',
          '2nd Half Total Corners: O/U 4.5',
          { line: 4.5 },
        ),
        mkOutcome('soccer_first_corner', 'Team to Take First Corner'),
        mkOutcome('soccer_game_corners_odd_even', 'Total Corners: Odd or Even'),
      ]);

      // Every corner market lands in a single corners tab.
      expect(groups.map((g) => g.key)).toEqual(['corners']);
    });

    it('splits team corner totals per team without a "Totals" suffix', () => {
      const [corners] = buildOutcomeGroups([
        mkOutcome('soccer_team_total_corners', 'Mexico Corners: O/U 4.5', {
          line: 4.5,
        }),
        mkOutcome('soccer_team_total_corners', 'Mexico Corners: O/U 5.5', {
          line: 5.5,
        }),
        mkOutcome(
          'soccer_team_total_corners',
          'South Africa Corners: O/U 2.5',
          {
            line: 2.5,
          },
        ),
      ]);

      const cornerCards = corners.subgroups?.filter((s) =>
        s.key.startsWith('soccer_team_total_corners'),
      );
      expect(cornerCards?.map((s) => s.title)).toEqual([
        'Mexico Corners',
        'South Africa Corners',
      ]);
    });

    it('keeps first-to-score as a single moneyline-style card', () => {
      const [gameLines] = buildOutcomeGroups([
        mkOutcome('soccer_first_to_score', 'Mexico', {
          id: 'fts-mex',
          groupItemThreshold: 0,
        }),
        mkOutcome('soccer_first_to_score', 'Neither', {
          id: 'fts-neither',
          groupItemThreshold: 2,
        }),
        mkOutcome('soccer_first_to_score', 'South Africa', {
          id: 'fts-rsa',
          groupItemThreshold: 1,
        }),
      ]);

      expect(gameLines.key).toBe('game_lines');
      const card = gameLines.subgroups?.find(
        (s) => s.key === 'soccer_first_to_score',
      );
      expect(card?.outcomes).toHaveLength(3);
    });

    it('keeps game-line soccer cards in semantic order regardless of volume', () => {
      const [gameLines] = buildOutcomeGroups([
        mkOutcome('soccer_team_totals', 'Mexico O/U 0.5', {
          line: 0.5,
          volume: 500000,
        }),
        mkOutcome('soccer_team_totals', 'South Africa O/U 0.5', {
          line: 0.5,
          volume: 400000,
        }),
        mkOutcome('soccer_first_to_score', 'Mexico', {
          id: 'fts-mex',
          groupItemThreshold: 0,
          volume: 300000,
        }),
        mkOutcome('soccer_first_to_score', 'Neither', {
          id: 'fts-neither',
          groupItemThreshold: 1,
          volume: 300000,
        }),
        mkOutcome('soccer_first_to_score', 'South Africa', {
          id: 'fts-rsa',
          groupItemThreshold: 2,
          volume: 300000,
        }),
        mkOutcome('both_teams_to_score', 'Both Teams to Score', {
          volume: 600000,
        }),
        mkOutcome('totals', 'O/U 2.5', {
          line: 2.5,
          volume: 200000,
        }),
        mkOutcome('totals', 'O/U 3.5', {
          line: 3.5,
          volume: 200000,
        }),
        mkOutcome('spreads', 'Mexico (-1.5)', {
          line: -1.5,
          volume: 100000,
        }),
        mkOutcome('spreads', 'South Africa (+1.5)', {
          line: 1.5,
          volume: 100000,
        }),
      ]);

      expect(gameLines.key).toBe('game_lines');
      expect(gameLines.subgroups?.map((s) => s.key)).toEqual([
        'spreads',
        'totals',
        'both_teams_to_score',
        'soccer_first_to_score',
        'soccer_team_totals-0',
        'soccer_team_totals-1',
      ]);
    });
  });

  describe('getOutcomeSubject', () => {
    const subjectOf = (groupItemTitle: string): string | null =>
      getOutcomeSubject({ groupItemTitle } as PredictOutcome);

    it.each([
      ['O/U 2.5', ''],
      ['Mexico O/U 0.5', 'Mexico'],
      ['Mexico 1st Half O/U 0.5', 'Mexico 1st Half'],
      ['Total Corners: O/U 8.5', 'Total Corners'],
      ['Armando González: 2+ goals', 'Armando González'],
      ['Alexis Vega: 4+ shots', 'Alexis Vega'],
      ['Brian Gutiérrez: 1+ assists', 'Brian Gutiérrez'],
      ['Goalscorer: Cho Guesung', 'Cho Guesung'],
      ['Victor Wembanyama: Points O/U 27.5', 'Victor Wembanyama'],
      ['Alexis Vega: Shots on Target O/U 1.5', 'Alexis Vega'],
      ['Lionel Messi: Goals + Assists O/U 1.5', 'Lionel Messi'],
    ])('extracts the subject from %p as %p', (title, expected) => {
      expect(subjectOf(title)).toBe(expected);
    });

    it.each([
      ['Mexico (-1.5)'],
      ['Mexico'],
      ['Both Teams to Score'],
      ['Mexico 1 - 0 South Africa'],
    ])('returns null for non-subject market %p', (title) => {
      expect(subjectOf(title)).toBeNull();
    });
  });

  describe('logUnsupportedSportsMarketTypesOnce', () => {
    it('logs unsupported market types only once per type', () => {
      const unsupportedOutcomes = new Map([['basketball_player_blocks', 2]]);

      logUnsupportedSportsMarketTypesOnce({ unsupportedOutcomes });
      logUnsupportedSportsMarketTypesOnce({ unsupportedOutcomes });

      expect(mockLoggerError).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Unsupported Predict sports market type: basketball_player_blocks',
        }),
        expect.objectContaining({
          context: expect.objectContaining({
            data: expect.objectContaining({
              method: 'logUnsupportedSportsMarketTypesOnce',
              sportsMarketType: 'basketball_player_blocks',
              droppedOutcomeCount: 2,
            }),
          }),
        }),
      );
    });
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
          negRisk: false,
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
    expect(preview.fees).toBeUndefined();
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
