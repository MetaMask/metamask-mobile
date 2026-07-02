import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  asPerpsActivityItem,
  formatPerpsOrderFee,
  formatSignedPerpsFiat,
  getPerpsCompletedStepCount,
  getPerpsFundsCtaLabel,
  getPerpsPositionSize,
  getPerpsPriceLabel,
  getPerpsPriceValue,
  getPerpsStepLabels,
  getPerpsTransaction,
  shouldShowPerpsPnl,
  type PerpsTransaction,
} from './ActivityDetailsPerps.utils';

type Fill = NonNullable<PerpsTransaction['fill']>;

const fill = (overrides: Partial<Fill>): PerpsTransaction['fill'] =>
  overrides as Fill;

describe('ActivityDetailsPerps.utils', () => {
  describe('getPerpsTransaction', () => {
    it('returns the perps data when raw is a perps transaction', () => {
      const data = { id: 'x' } as PerpsTransaction;
      const item = {
        raw: { type: 'perpsTransaction', data },
      } as ActivityListItem;
      expect(getPerpsTransaction(item)).toBe(data);
    });

    it('returns undefined for non-perps raw or missing raw', () => {
      expect(
        getPerpsTransaction({
          raw: { type: 'predictActivity', data: {} },
        } as unknown as ActivityListItem),
      ).toBeUndefined();
      expect(getPerpsTransaction({} as ActivityListItem)).toBeUndefined();
    });
  });

  describe('formatSignedPerpsFiat', () => {
    it('returns $0 for zero regardless of sign', () => {
      expect(formatSignedPerpsFiat(0, true)).toBe('$0');
      expect(formatSignedPerpsFiat(0, false)).toBe('$0');
    });

    it('keeps full precision for sub-cent funding fees', () => {
      expect(formatSignedPerpsFiat('0.00000001', true)).toBe('+$0.00000001');
      expect(formatSignedPerpsFiat('0.00000001', false)).toBe('-$0.00000001');
    });

    it('uses the shared Perps fiat formatter for >= $0.01 values', () => {
      expect(formatSignedPerpsFiat(1.5, true)).toBe('+$1.50');
      expect(formatSignedPerpsFiat(1.5, false)).toBe('-$1.50');
      expect(formatSignedPerpsFiat(-2, true)).toBe('+$2');
    });
  });

  describe('getPerpsPositionSize', () => {
    it('multiplies size × entryPrice when both present', () => {
      expect(
        getPerpsPositionSize(fill({ size: '0.0001', entryPrice: '92113' })),
      ).toBe('$9.21');
    });

    it('returns undefined when fill, size or entryPrice is missing', () => {
      expect(getPerpsPositionSize(undefined)).toBeUndefined();
      expect(getPerpsPositionSize(fill({ entryPrice: '1' }))).toBeUndefined();
      expect(getPerpsPositionSize(fill({ size: '1' }))).toBeUndefined();
    });
  });

  describe('getPerpsPriceLabel', () => {
    it('uses close price for closed/flipped, entry price otherwise', () => {
      expect(getPerpsPriceLabel(fill({ action: 'Closed' }))).toBe(
        strings('perps.transactions.position.close_price'),
      );
      expect(getPerpsPriceLabel(fill({ action: 'Flipped' }))).toBe(
        strings('perps.transactions.position.close_price'),
      );
      expect(getPerpsPriceLabel(fill({ action: 'Opened' }))).toBe(
        strings('perps.transactions.position.entry_price'),
      );
      expect(getPerpsPriceLabel(undefined)).toBe(
        strings('perps.transactions.position.entry_price'),
      );
    });
  });

  describe('getPerpsPriceValue', () => {
    it('formats a present price (universal ranges) and passes through undefined', () => {
      expect(getPerpsPriceValue('92113')).toBe('$92,113');
      expect(getPerpsPriceValue(undefined)).toBeUndefined();
    });
  });

  describe('shouldShowPerpsPnl', () => {
    it('is true only when pnl exists and the position closed/flipped', () => {
      expect(shouldShowPerpsPnl(fill({ pnl: '-$1', action: 'Closed' }))).toBe(
        true,
      );
      expect(shouldShowPerpsPnl(fill({ pnl: '-$1', action: 'Flipped' }))).toBe(
        true,
      );
      expect(shouldShowPerpsPnl(fill({ pnl: '-$1', action: 'Opened' }))).toBe(
        false,
      );
      expect(shouldShowPerpsPnl(fill({ action: 'Closed' }))).toBe(false);
      expect(shouldShowPerpsPnl(undefined)).toBe(false);
    });
  });

  describe('formatPerpsOrderFee', () => {
    it('formats the fee when filled and $0 when not', () => {
      expect(formatPerpsOrderFee(2, true)).toBe('$2');
      expect(formatPerpsOrderFee(2, false)).toBe('$0');
    });
  });

  describe('getPerpsFundsCtaLabel', () => {
    it('returns try-again on failure, else fund/withdraw by direction', () => {
      expect(getPerpsFundsCtaLabel('failed', true)).toBe(
        strings('perps.transactions.try_again'),
      );
      expect(getPerpsFundsCtaLabel('success', true)).toBe(
        strings('perps.transactions.fund_again'),
      );
      expect(getPerpsFundsCtaLabel('success', false)).toBe(
        strings('perps.withdrawal.withdraw'),
      );
    });
  });

  describe('getPerpsStepLabels', () => {
    it('returns 4 deposit steps and 3 withdrawal steps', () => {
      expect(getPerpsStepLabels('deposit')).toHaveLength(4);
      expect(getPerpsStepLabels('withdrawal')).toHaveLength(3);
    });
  });

  describe('getPerpsCompletedStepCount', () => {
    it.each([
      ['completed', 4, 4],
      ['failed', 4, 3],
      ['bridging', 4, 3],
      ['pending', 4, 1],
      ['failed', 1, 1],
    ] as const)(
      'status=%s totalSteps=%i → %i',
      (status, totalSteps, expected) => {
        expect(getPerpsCompletedStepCount({ status, totalSteps })).toBe(
          expected,
        );
      },
    );
  });

  describe('asPerpsActivityItem', () => {
    it('returns the same reference (type cast)', () => {
      const item = { type: 'perpsAddFunds' } as ActivityListItem;
      expect(asPerpsActivityItem(item)).toBe(item);
    });
  });
});
