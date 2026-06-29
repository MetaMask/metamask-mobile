import type { PredictOutcome } from '../../types';
import { POLYMARKET_PROVIDER_ID } from './constants';
import {
  buildOutcomeGroups,
  normalizeEnabledSportsMarketTypes,
  normalizeSportsMarketTypes,
} from './outcomeGrouping';

function createGroupingOutcome(
  id: string,
  sportsMarketType: string,
  line?: number,
  shortTitle = id,
  groupItemTitle = id,
): PredictOutcome {
  return {
    id,
    providerId: POLYMARKET_PROVIDER_ID,
    marketId: 'market-1',
    title: id,
    description: id,
    image: 'icon.png',
    status: 'open',
    tokens: [{ id: `${id}-token`, title: shortTitle, shortTitle, price: 0.5 }],
    volume: 100,
    groupItemTitle,
    sportsMarketType,
    ...(line !== undefined && { line }),
  };
}

describe('outcomeGrouping', () => {
  describe('normalizeEnabledSportsMarketTypes', () => {
    it('defaults to supported market types when value is missing', () => {
      expect(normalizeEnabledSportsMarketTypes(undefined)).toEqual([
        'moneyline',
        'spreads',
        'totals',
        'both_teams_to_score',
        'both_teams_to_score_first_half',
        'both_teams_to_score_second_half',
        'first_half_totals',
        'second_half_totals',
        'soccer_first_to_score',
        'soccer_halftime_result',
        'soccer_second_half_result',
        'soccer_player_goals',
        'soccer_team_to_advance',
        'soccer_extra_time',
        'soccer_penalty_shootout',
        'team_totals',
        'soccer_team_totals',
        'basketball_team_to_score_first',
        'soccer_exact_score',
      ]);
    });

    it('honors explicit empty array', () => {
      expect(normalizeEnabledSportsMarketTypes([])).toEqual([]);
    });

    it('filters unsupported types and deduplicates case-insensitively', () => {
      expect(
        normalizeEnabledSportsMarketTypes([
          'moneyline',
          'MONEYLINE',
          'spreads',
          'totals',
          'first_half_totals',
          'soccer_halftime_result',
          'soccer_player_goals',
          'points',
        ]),
      ).toEqual([
        'moneyline',
        'spreads',
        'totals',
        'first_half_totals',
        'soccer_halftime_result',
        'soccer_player_goals',
      ]);
    });
  });

  describe('normalizeSportsMarketTypes', () => {
    it('returns an empty list for non-array values', () => {
      expect(normalizeSportsMarketTypes(undefined)).toEqual([]);
      expect(normalizeSportsMarketTypes('moneyline')).toEqual([]);
    });

    it('filters unsupported types and deduplicates case-insensitively', () => {
      expect(
        normalizeSportsMarketTypes([
          'soccer_team_to_advance',
          'SOCCER_TEAM_TO_ADVANCE',
          'unsupported_market',
        ]),
      ).toEqual(['soccer_team_to_advance']);
    });
  });

  describe('buildOutcomeGroups', () => {
    it('groups full-tie-outcome markets in game lines below moneyline', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('moneyline', 'moneyline'),
        createGroupingOutcome('extra-time', 'soccer_extra_time'),
        createGroupingOutcome('penalty-shootout', 'soccer_penalty_shootout'),
        createGroupingOutcome('team-to-advance', 'soccer_team_to_advance'),
      ]);

      expect(groups.map((group) => group.key)).toEqual(['game_lines']);
      expect(groups[0].subgroups?.map((group) => group.key)).toEqual([
        'soccer_team_to_advance',
        'moneyline',
        'soccer_extra_time',
        'soccer_penalty_shootout',
      ]);
    });

    it('orders team to advance before moneyline in game lines', () => {
      const outcomes = [
        createGroupingOutcome('moneyline', 'moneyline'),
        createGroupingOutcome('team-to-advance', 'soccer_team_to_advance'),
        createGroupingOutcome('spread', 'spreads', -1.5),
        createGroupingOutcome('total', 'totals', 2.5),
      ];

      const groups = buildOutcomeGroups(outcomes);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({
        key: 'game_lines',
        outcomes: [],
      });
      expect(groups[0].subgroups?.map((group) => group.key)).toEqual([
        'soccer_team_to_advance',
        'moneyline',
        'spreads',
        'totals',
      ]);
    });

    it('groups tennis first set markets separately from game lines', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('moneyline', 'moneyline'),
        createGroupingOutcome('set-total', 'tennis_set_totals'),
        createGroupingOutcome('match-total', 'tennis_match_totals'),
        createGroupingOutcome('completed', 'tennis_completed_match'),
        createGroupingOutcome('first-set-winner', 'tennis_first_set_winner'),
        createGroupingOutcome('first-set-total', 'tennis_first_set_totals'),
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

    it('orders spread subgroup outcomes descending when first spread is team one negative', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('moneyline', 'moneyline'),
        createGroupingOutcome('arg-minus-1.5', 'spreads', -1.5, 'ARG -1.5'),
        createGroupingOutcome('arg-plus-1.5', 'spreads', -1.5, 'ARG +1.5'),
        createGroupingOutcome('arg-minus-2.5', 'spreads', -2.5, 'ARG -2.5'),
        createGroupingOutcome('arg-plus-2.5', 'spreads', -2.5, 'ARG +2.5'),
      ]);

      const spreadsSubgroup = groups[0].subgroups?.find(
        (subgroup) => subgroup.key === 'spreads',
      );

      expect(spreadsSubgroup?.outcomes.map((outcome) => outcome.id)).toEqual([
        'arg-plus-2.5',
        'arg-plus-1.5',
        'arg-minus-1.5',
        'arg-minus-2.5',
      ]);
      expect(
        spreadsSubgroup?.outcomes.map((outcome) => Math.abs(outcome.line ?? 0)),
      ).toEqual([2.5, 1.5, 1.5, 2.5]);
    });

    it('orders spread subgroup outcomes ascending when first spread is team two negative', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('moneyline', 'moneyline'),
        createGroupingOutcome('irq-plus-1.5', 'spreads', -1.5, 'IRQ +1.5'),
        createGroupingOutcome('irq-plus-2.5', 'spreads', -2.5, 'IRQ +2.5'),
        createGroupingOutcome('irq-minus-2.5', 'spreads', -2.5, 'IRQ -2.5'),
        createGroupingOutcome('irq-minus-1.5', 'spreads', -1.5, 'IRQ -1.5'),
        createGroupingOutcome('irq-plus-3.5', 'spreads', -3.5, 'IRQ +3.5'),
        createGroupingOutcome('irq-minus-3.5', 'spreads', -3.5, 'IRQ -3.5'),
      ]);

      const spreadsSubgroup = groups[0].subgroups?.find(
        (subgroup) => subgroup.key === 'spreads',
      );

      expect(spreadsSubgroup?.outcomes.map((outcome) => outcome.id)).toEqual([
        'irq-minus-3.5',
        'irq-minus-2.5',
        'irq-minus-1.5',
        'irq-plus-1.5',
        'irq-plus-2.5',
        'irq-plus-3.5',
      ]);
      expect(
        spreadsSubgroup?.outcomes.map((outcome) => Math.abs(outcome.line ?? 0)),
      ).toEqual([3.5, 2.5, 1.5, 1.5, 2.5, 3.5]);
    });

    it('orders non-spread line subgroup outcomes by line', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('moneyline', 'moneyline'),
        createGroupingOutcome('total-216.5', 'totals', 216.5),
        createGroupingOutcome('total-211.5', 'totals', 211.5),
        createGroupingOutcome('total-214.5', 'totals', 214.5),
      ]);

      const totalsSubgroup = groups[0].subgroups?.find(
        (subgroup) => subgroup.key === 'totals',
      );

      expect(totalsSubgroup?.outcomes.map((outcome) => outcome.id)).toEqual([
        'total-211.5',
        'total-214.5',
        'total-216.5',
      ]);
    });

    it('splits soccer team totals into one line subgroup per team', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome(
          'portugal-total-1.5',
          'soccer_team_totals',
          1.5,
          'O 1.5',
          'Portugal O/U 1.5',
        ),
        createGroupingOutcome(
          'uzbekistan-total-0.5',
          'soccer_team_totals',
          0.5,
          'O 0.5',
          'Uzbekistan O/U 0.5',
        ),
        createGroupingOutcome(
          'portugal-total-0.5',
          'soccer_team_totals',
          0.5,
          'O 0.5',
          'Portugal O/U 0.5',
        ),
        createGroupingOutcome(
          'uzbekistan-total-1.5',
          'soccer_team_totals',
          1.5,
          'O 1.5',
          'Uzbekistan O/U 1.5',
        ),
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({
        key: 'team_totals',
        outcomes: [],
      });
      expect(groups[0].subgroups).toEqual([
        expect.objectContaining({
          key: 'soccer_team_totals-0',
          title: 'Portugal Totals',
          outcomes: [
            expect.objectContaining({ id: 'portugal-total-0.5' }),
            expect.objectContaining({ id: 'portugal-total-1.5' }),
          ],
        }),
        expect.objectContaining({
          key: 'soccer_team_totals-1',
          title: 'Uzbekistan Totals',
          outcomes: [
            expect.objectContaining({ id: 'uzbekistan-total-0.5' }),
            expect.objectContaining({ id: 'uzbekistan-total-1.5' }),
          ],
        }),
      ]);
    });

    it('groups supported half markets under halves', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('h1-total', 'first_half_totals', 0.5),
        createGroupingOutcome('h2-total', 'second_half_totals', 1.5),
        createGroupingOutcome(
          'btts-h1',
          'both_teams_to_score_first_half',
          undefined,
          'Yes',
        ),
        createGroupingOutcome(
          'btts-h2',
          'both_teams_to_score_second_half',
          undefined,
          'Yes',
        ),
        createGroupingOutcome('h1-result', 'soccer_halftime_result'),
        createGroupingOutcome('h2-result', 'soccer_second_half_result'),
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0].key).toBe('halves');
      expect(groups[0].subgroups?.map((subgroup) => subgroup.key)).toEqual([
        'soccer_halftime_result',
        'soccer_second_half_result',
        'first_half_totals',
        'second_half_totals',
        'both_teams_to_score_first_half',
        'both_teams_to_score_second_half',
      ]);
    });

    it('keeps full-match BTTS under game lines', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome('btts', 'both_teams_to_score', undefined, 'Yes'),
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0].key).toBe('game_lines');
      expect(groups[0].outcomes[0]).toEqual(
        expect.objectContaining({ sportsMarketType: 'both_teams_to_score' }),
      );
    });

    it('splits soccer player goals into one subgroup per player', () => {
      const groups = buildOutcomeGroups([
        createGroupingOutcome(
          'player-a-1',
          'soccer_player_goals',
          0.5,
          'Yes',
          'Player A: 1+ goals',
        ),
        createGroupingOutcome(
          'player-a-2',
          'soccer_player_goals',
          1.5,
          'Yes',
          'Player A: 2+ goals',
        ),
        createGroupingOutcome(
          'player-b-1',
          'soccer_player_goals',
          0.5,
          'Yes',
          'Player B: 1+ goals',
        ),
        createGroupingOutcome(
          'player-c-1',
          'soccer_player_goals',
          0.5,
          'Yes',
          'Player C: 1+ goals',
        ),
        createGroupingOutcome(
          'player-d-1',
          'soccer_player_goals',
          0.5,
          'Yes',
          'Player D: 1+ goals',
        ),
        createGroupingOutcome(
          'player-e-1',
          'soccer_player_goals',
          0.5,
          'Yes',
          'Player E: 1+ goals',
        ),
        createGroupingOutcome(
          'player-f-1',
          'soccer_player_goals',
          0.5,
          'Yes',
          'Player F: 1+ goals',
        ),
      ]);

      expect(groups).toHaveLength(1);
      expect(groups[0].key).toBe('goals');
      expect(groups[0].subgroups).toHaveLength(6);
      expect(groups[0].subgroups?.map((subgroup) => subgroup.title)).toEqual([
        'Player A',
        'Player B',
        'Player C',
        'Player D',
        'Player E',
        'Player F',
      ]);
      expect(groups[0].subgroups?.[0]).toEqual(
        expect.objectContaining({
          key: 'soccer_player_goals-player-a',
          title: 'Player A',
          outcomes: [
            expect.objectContaining({ id: 'player-a-1' }),
            expect.objectContaining({ id: 'player-a-2' }),
          ],
        }),
      );
    });
  });
});
