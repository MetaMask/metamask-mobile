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
        'soccer_first_to_score',
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
          'first_half_moneyline',
          'points',
        ]),
      ).toEqual(['moneyline', 'spreads', 'totals']);
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
  });
});
