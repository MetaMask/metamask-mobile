import { RECURRING_INTERVALS } from '@metamask/subscription-controller';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { formatSubscriptionFiat } from './formatSubscriptionFiat';
import {
  getBenefitsPriceLine,
  getPlanSelectorCardCopy,
  resolveSelectedPlanId,
} from './getMoneyAccountPlusPricingCopy';
import type {
  MoneyAccountPlusPricingView,
  PlanPricingView,
} from './mapMoneyAccountPlusPricing';

const createPlan = (
  overrides: Partial<PlanPricingView> & Pick<PlanPricingView, 'interval'>,
): PlanPricingView => ({
  currency: 'usd',
  unitAmount: 499,
  unitDecimals: 2,
  amount: 4.99,
  ...overrides,
});

const READY_BOTH: MoneyAccountPlusPricingView = {
  status: 'ready',
  monthly: createPlan({
    interval: RECURRING_INTERVALS.month,
    unitAmount: 499,
    amount: 4.99,
  }),
  annual: createPlan({
    interval: RECURRING_INTERVALS.year,
    unitAmount: 4999,
    amount: 49.99,
  }),
  savings: {
    amount: 9.89,
    equivalentMonthly: 49.99 / 12,
  },
};

describe('getMoneyAccountPlusPricingCopy', () => {
  const originalLocale = I18n.locale;

  beforeEach(() => {
    I18n.locale = 'en-US';
  });

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  describe('resolveSelectedPlanId', () => {
    it('keeps annual when the annual plan is present', () => {
      const result = resolveSelectedPlanId('annual', READY_BOTH);

      expect(result).toBe('annual');
    });

    it('falls back to monthly when annual is missing', () => {
      const plusPricing: MoneyAccountPlusPricingView = {
        status: 'ready',
        monthly: READY_BOTH.monthly,
      };

      const result = resolveSelectedPlanId('annual', plusPricing);

      expect(result).toBe('monthly');
    });

    it('falls back to annual when monthly is missing', () => {
      const plusPricing: MoneyAccountPlusPricingView = {
        status: 'ready',
        annual: READY_BOTH.annual,
      };

      const result = resolveSelectedPlanId('monthly', plusPricing);

      expect(result).toBe('annual');
    });
  });

  describe('getBenefitsPriceLine', () => {
    it('returns undefined when pricing is not ready', () => {
      const result = getBenefitsPriceLine({ status: 'unavailable' });

      expect(result).toBeUndefined();
    });

    it('interpolates monthly and annual prices when both exist', () => {
      const result = getBenefitsPriceLine(READY_BOTH);

      expect(result).toBe(
        strings('pro_subscription.description', {
          monthlyPrice: formatSubscriptionFiat(4.99, 'usd'),
          annualPrice: formatSubscriptionFiat(49.99, 'usd'),
        }),
      );
    });

    it('uses the monthly-only description when annual is missing', () => {
      const result = getBenefitsPriceLine({
        status: 'ready',
        monthly: READY_BOTH.monthly,
      });

      expect(result).toBe(
        strings('pro_subscription.description_monthly', {
          monthlyPrice: formatSubscriptionFiat(4.99, 'usd'),
        }),
      );
    });
  });

  describe('getPlanSelectorCardCopy', () => {
    it('returns undefined when the interval is missing', () => {
      const result = getPlanSelectorCardCopy('annual', {
        status: 'ready',
        monthly: READY_BOTH.monthly,
      });

      expect(result).toBeUndefined();
    });

    it('formats monthly price without a savings badge', () => {
      const result = getPlanSelectorCardCopy('monthly', READY_BOTH);

      expect(result).toEqual({
        price: strings('pro_subscription.plans.monthly.price', {
          price: formatSubscriptionFiat(4.99, 'usd'),
        }),
      });
    });

    it('formats annual price, equivalent monthly sub price, and savings badge', () => {
      const result = getPlanSelectorCardCopy('annual', READY_BOTH);

      expect(result).toEqual({
        price: strings('pro_subscription.plans.annual.price', {
          price: formatSubscriptionFiat(49.99, 'usd'),
        }),
        subPrice: strings('pro_subscription.plans.annual.sub_price', {
          price: formatSubscriptionFiat(49.99 / 12, 'usd'),
        }),
        savingsBadge: strings('pro_subscription.plans.annual.badge'),
      });
    });

    it('omits savings copy when savings are undefined', () => {
      const result = getPlanSelectorCardCopy('annual', {
        status: 'ready',
        annual: READY_BOTH.annual,
        monthly: READY_BOTH.monthly,
      });

      expect(result?.subPrice).toBeUndefined();
      expect(result?.savingsBadge).toBeUndefined();
    });

    it('includes a trial label when trialPeriodDays is greater than zero', () => {
      const result = getPlanSelectorCardCopy('monthly', {
        status: 'ready',
        monthly: createPlan({
          interval: RECURRING_INTERVALS.month,
          trialPeriodDays: 7,
        }),
      });

      expect(result?.trialLabel).toBe(
        strings('pro_subscription.plans.trial', { days: '7' }),
      );
    });
  });
});
