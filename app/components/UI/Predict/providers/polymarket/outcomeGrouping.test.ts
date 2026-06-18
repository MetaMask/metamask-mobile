import type { PredictOutcome } from '../../types';
import { POLYMARKET_PROVIDER_ID } from './constants';
import {
  buildOutcomeGroups,
  normalizeEnabledSportsMarketTypes,
} from './outcomeGrouping';

function createGroupingOutcome(
  id: string,
  sportsMarketType: string,
  line?: number,
  shortTitle = id,
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
    groupItemTitle: id,
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

  describe('buildOutcomeGroups', () => {
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
  });
});
