import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type PricingResponse,
  type ProductPrice,
} from '@metamask/subscription-controller';
import { mapMoneyAccountPlusPricing } from './mapMoneyAccountPlusPricing';

const createPrice = (overrides: Partial<ProductPrice> = {}): ProductPrice => ({
  interval: RECURRING_INTERVALS.month,
  unitAmount: 499,
  unitDecimals: 2,
  currency: 'usd',
  trialPeriodDays: 0,
  minBillingCycles: 1,
  minBillingCyclesForBalance: 1,
  ...overrides,
});

const createPricing = (
  products: PricingResponse['products'],
): PricingResponse => ({
  products,
  paymentMethods: [],
});

const MONTHLY_PRICE = createPrice({
  interval: RECURRING_INTERVALS.month,
  unitAmount: 499,
});

const ANNUAL_PRICE = createPrice({
  interval: RECURRING_INTERVALS.year,
  unitAmount: 4999,
});

describe('mapMoneyAccountPlusPricing', () => {
  describe('interval mapping', () => {
    it('maps month and year by interval when monthly is listed first', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [MONTHLY_PRICE, ANNUAL_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.status).toBe('ready');
      expect(result.monthly?.interval).toBe(RECURRING_INTERVALS.month);
      expect(result.monthly?.amount).toBe(4.99);
      expect(result.annual?.interval).toBe(RECURRING_INTERVALS.year);
      expect(result.annual?.amount).toBe(49.99);
    });

    it('maps month and year by interval when annual is listed first', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [ANNUAL_PRICE, MONTHLY_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.monthly?.unitAmount).toBe(499);
      expect(result.annual?.unitAmount).toBe(4999);
    });

    it('keeps the first usable row when an interval is duplicated', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [
            createPrice({
              interval: RECURRING_INTERVALS.month,
              unitAmount: 499,
            }),
            createPrice({
              interval: RECURRING_INTERVALS.month,
              unitAmount: 999,
            }),
          ],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.monthly?.unitAmount).toBe(499);
    });
  });

  describe('product selection', () => {
    it('ignores Shield prices when mapping Plus plans', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.SHIELD,
          prices: [
            createPrice({
              interval: RECURRING_INTERVALS.month,
              unitAmount: 800,
            }),
            createPrice({
              interval: RECURRING_INTERVALS.year,
              unitAmount: 8000,
            }),
          ],
        },
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [MONTHLY_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.monthly?.unitAmount).toBe(499);
      expect(result.annual).toBeUndefined();
    });
  });

  describe('availability', () => {
    it('returns unavailable when pricing is undefined', () => {
      const result = mapMoneyAccountPlusPricing(undefined);

      expect(result).toEqual({ status: 'unavailable' });
    });

    it('returns unavailable when products is empty', () => {
      const result = mapMoneyAccountPlusPricing(createPricing([]));

      expect(result).toEqual({ status: 'unavailable' });
    });

    it('returns unavailable when the Plus product is missing', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.SHIELD,
          prices: [MONTHLY_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result).toEqual({ status: 'unavailable' });
    });

    it('returns unavailable when the Plus product has no prices', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result).toEqual({ status: 'unavailable' });
    });
  });

  describe('malformed rows', () => {
    it('omits a Plus price row with a non-finite unitAmount', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [createPrice({ unitAmount: Number.NaN }), ANNUAL_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.status).toBe('ready');
      expect(result.monthly).toBeUndefined();
      expect(result.annual?.interval).toBe(RECURRING_INTERVALS.year);
    });

    it('returns malformed when Plus prices exist but none are usable', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [
            createPrice({
              interval: 'week' as ProductPrice['interval'],
              unitAmount: 499,
            }),
            createPrice({ unitDecimals: -1 }),
          ],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result).toEqual({ status: 'malformed' });
    });

    it('omits trialPeriodDays when the value is not a finite non-negative number', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [
            createPrice({
              trialPeriodDays: Number.NaN,
            }),
          ],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.monthly?.trialPeriodDays).toBeUndefined();
    });

    it('includes trialPeriodDays when the value is zero', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [MONTHLY_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.monthly?.trialPeriodDays).toBe(0);
    });
  });

  describe('savings', () => {
    it('computes annual savings from monthly and annual amounts', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [MONTHLY_PRICE, ANNUAL_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.savings).toEqual({
        amount: 4.99 * 12 - 49.99,
        equivalentMonthly: 49.99 / 12,
      });
    });

    it('omits savings when only one interval is present', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [MONTHLY_PRICE],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.savings).toBeUndefined();
    });

    it('omits savings when annual is not cheaper than twelve monthly payments', () => {
      const pricing = createPricing([
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [
            createPrice({
              interval: RECURRING_INTERVALS.month,
              unitAmount: 499,
            }),
            createPrice({
              interval: RECURRING_INTERVALS.year,
              unitAmount: 5999,
            }),
          ],
        },
      ]);

      const result = mapMoneyAccountPlusPricing(pricing);

      expect(result.savings).toBeUndefined();
    });
  });
});
