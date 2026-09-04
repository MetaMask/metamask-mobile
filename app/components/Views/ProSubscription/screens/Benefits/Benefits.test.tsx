import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import { RECURRING_INTERVALS } from '@metamask/subscription-controller';
import Benefits from './Benefits';
import { BenefitsTestIds } from './Benefits.testIds';
import {
  BENEFITS,
  BENEFIT_DETAILS,
  PLANS,
  type PlanId,
} from './Benefits.constants';
import I18n, { strings } from '../../../../../../locales/i18n';
import { useSubscriptionPricing } from './hooks/useSubscriptionPricing';
import { formatSubscriptionFiat } from './utils/formatSubscriptionFiat';
import type { MoneyAccountPlusPricingView } from './utils/mapMoneyAccountPlusPricing';

jest.mock('./hooks/useSubscriptionPricing', () => ({
  useSubscriptionPricing: jest.fn(),
}));

const mockUseSubscriptionPricing = jest.mocked(useSubscriptionPricing);
const mockRetry = jest.fn();

const READY_PLUS_PRICING: MoneyAccountPlusPricingView = {
  status: 'ready',
  monthly: {
    interval: RECURRING_INTERVALS.month,
    currency: 'usd',
    unitAmount: 499,
    unitDecimals: 2,
    amount: 4.99,
  },
  annual: {
    interval: RECURRING_INTERVALS.year,
    currency: 'usd',
    unitAmount: 4999,
    unitDecimals: 2,
    amount: 49.99,
  },
  savings: {
    amount: 9.89,
    equivalentMonthly: 49.99 / 12,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSuccess = jest.fn();

const mockPricingState = ({
  isLoading = false,
  hasError = false,
  plusPricing = READY_PLUS_PRICING,
}: {
  isLoading?: boolean;
  hasError?: boolean;
  plusPricing?: MoneyAccountPlusPricingView;
} = {}) => {
  mockUseSubscriptionPricing.mockReturnValue({
    plusPricing,
    isLoading,
    hasError,
    retry: mockRetry,
  });
};

const renderBenefits = (initialPlan?: PlanId) =>
  render(<Benefits onSuccess={mockOnSuccess} initialPlan={initialPlan} />);

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Benefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPricingState();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the title', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.TITLE)).toHaveTextContent(
        strings('pro_subscription.title'),
      );
    });

    it('renders the price line from mapped Plus pricing', () => {
      I18n.locale = 'en-US';

      const { getByTestId } = renderBenefits();

      expect(getByTestId(BenefitsTestIds.PRICE_LINE)).toHaveTextContent(
        strings('pro_subscription.description', {
          monthlyPrice: formatSubscriptionFiat(4.99, 'usd'),
          annualPrice: formatSubscriptionFiat(49.99, 'usd'),
        }),
      );
    });

    it('renders all six benefit rows', () => {
      const { getByTestId } = renderBenefits();
      expect(BENEFITS).toHaveLength(6);
      BENEFITS.forEach((benefit) => {
        expect(
          getByTestId(BenefitsTestIds.BENEFIT_ROW(benefit.id)),
        ).toBeOnTheScreen();
      });
    });

    it('renders each benefit row title and subtitle from i18n', () => {
      const { getByText } = renderBenefits();
      BENEFITS.forEach((benefit) => {
        expect(getByText(strings(benefit.title))).toBeOnTheScreen();
        expect(getByText(strings(benefit.subtitle))).toBeOnTheScreen();
      });
    });

    it('renders both plan selector cards with mapped prices', () => {
      I18n.locale = 'en-US';

      const { getByTestId } = renderBenefits();

      PLANS.forEach((plan) => {
        expect(
          getByTestId(BenefitsTestIds.PLAN_CARD(plan.id)),
        ).toBeOnTheScreen();
      });
      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_PRICE('monthly')),
      ).toHaveTextContent(
        strings('pro_subscription.plans.monthly.price', {
          price: formatSubscriptionFiat(4.99, 'usd'),
        }),
      );
      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_PRICE('annual')),
      ).toHaveTextContent(
        strings('pro_subscription.plans.annual.price', {
          price: formatSubscriptionFiat(49.99, 'usd'),
        }),
      );
      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_SAVINGS_BADGE('annual')),
      ).toHaveTextContent(strings('pro_subscription.plans.annual.badge'));
    });

    it('renders the CTA button', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toBeOnTheScreen();
    });
  });

  // ── Plan selection ─────────────────────────────────────────────────────────

  describe('Plan selection', () => {
    it('renders CTA button with join label by default', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });

    it('CTA button shows join label when Annual plan is selected', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.PLAN_CARD('annual')));

      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });

    it('CTA button shows join label when Monthly plan is tapped', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.PLAN_CARD('monthly')));

      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });

    it('CTA button shows join label after switching back to Annual', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.PLAN_CARD('monthly')));
      fireEvent.press(getByTestId(BenefitsTestIds.PLAN_CARD('annual')));

      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });
  });

  // ── Callbacks ─────────────────────────────────────────────────────────────

  describe('Callbacks', () => {
    it('calls onSuccess when the CTA is pressed', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CTA_BUTTON));

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('pressing a benefit row opens the detail sheet', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW(BENEFITS[0].id)));

      expect(
        getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  // ── BenefitDetails bottom sheet ───────────────────────────────────────────

  describe('BenefitDetails bottom sheet', () => {
    it('is not visible by default', () => {
      const { queryByTestId } = renderBenefits();

      expect(
        queryByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('opens when any benefit row is pressed', () => {
      const { getByTestId } = renderBenefits();

      BENEFITS.forEach((benefit) => {
        fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW(benefit.id)));
        expect(
          getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
        ).toBeOnTheScreen();
        fireEvent(
          getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
          'close',
        );
      });
    });

    it('shows the description for the pressed benefit', () => {
      const apyDetail = BENEFIT_DETAILS.find((d) => d.id === 'apy');
      if (!apyDetail)
        throw new Error('apy detail not found in BENEFIT_DETAILS');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('apy')));

      apyDetail.description.forEach((descriptionKey) => {
        expect(getByText(strings(descriptionKey))).toBeOnTheScreen();
      });
    });

    it('shows bullet points for a benefit that has points (cashback)', () => {
      const cashbackDetail = BENEFIT_DETAILS.find((d) => d.id === 'cashback');
      if (!cashbackDetail)
        throw new Error('cashback detail not found in BENEFIT_DETAILS');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('cashback')));

      cashbackDetail.points?.forEach((pointKey) => {
        expect(getByText(`\u2022 ${strings(pointKey)}`)).toBeOnTheScreen();
      });
    });

    it('shows bullet points for a benefit that has points (member_pricing)', () => {
      const memberPricingDetail = BENEFIT_DETAILS.find(
        (d) => d.id === 'member_pricing',
      );
      if (!memberPricingDetail)
        throw new Error('member_pricing detail not found in BENEFIT_DETAILS');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(
        getByTestId(BenefitsTestIds.BENEFIT_ROW('member_pricing')),
      );

      memberPricingDetail.points?.forEach((pointKey) => {
        expect(getByText(`\u2022 ${strings(pointKey)}`)).toBeOnTheScreen();
      });
    });

    it('shows description paragraphs, link, and notes for the protection benefit', () => {
      const protectionDetail = BENEFIT_DETAILS.find(
        (d) => d.id === 'protection',
      );
      if (!protectionDetail)
        throw new Error('protection detail not found in BENEFIT_DETAILS');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('protection')));

      if (!protectionDetail.link) throw new Error('protection.link missing');
      if (!protectionDetail.notes) throw new Error('protection.notes missing');
      protectionDetail.description.forEach((descriptionKey) => {
        expect(getByText(strings(descriptionKey))).toBeOnTheScreen();
      });
      expect(getByText(strings(protectionDetail.link.label))).toBeOnTheScreen();
      expect(getByText(strings(protectionDetail.notes))).toBeOnTheScreen();
    });

    it('opens the learn more URL when the link is pressed', () => {
      const protectionDetail = BENEFIT_DETAILS.find(
        (d) => d.id === 'protection',
      );
      if (!protectionDetail)
        throw new Error('protection detail not found in BENEFIT_DETAILS');
      if (!protectionDetail.link) throw new Error('protection.link missing');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('protection')));
      fireEvent.press(getByText(strings(protectionDetail.link.label)));

      expect(Linking.openURL).toHaveBeenCalledWith(protectionDetail.link.url);
    });

    it('does not show points for benefits that have none (apy)', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('apy')));

      const sheet = getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER);
      expect(sheet).toBeOnTheScreen();
      expect(within(sheet).queryAllByText(/^\u2022/)).toHaveLength(0);
    });

    it('closes the sheet when onClose is fired', () => {
      const { getByTestId, queryByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW(BENEFITS[0].id)));
      expect(
        getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
      ).toBeOnTheScreen();

      fireEvent(
        getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
        'close',
      );

      expect(
        queryByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('shows different content when a different benefit row is pressed', () => {
      const apyDetail = BENEFIT_DETAILS.find((d) => d.id === 'apy');
      const supportDetail = BENEFIT_DETAILS.find((d) => d.id === 'support');
      if (!apyDetail)
        throw new Error('apy detail not found in BENEFIT_DETAILS');
      if (!supportDetail)
        throw new Error('support detail not found in BENEFIT_DETAILS');
      const { getByTestId, getByText, queryByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('apy')));
      apyDetail.description.forEach((descriptionKey) => {
        expect(getByText(strings(descriptionKey))).toBeOnTheScreen();
      });

      fireEvent(
        getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
        'close',
      );

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('support')));
      expect(
        getByText(strings(supportDetail.description[0])),
      ).toBeOnTheScreen();
      apyDetail.description.forEach((descriptionKey) => {
        expect(queryByText(strings(descriptionKey))).not.toBeOnTheScreen();
      });
    });
  });

  // ── initialPlan prop ──────────────────────────────────────────────────────

  describe('initialPlan prop', () => {
    it('pre-selects the Monthly plan when initialPlan is "monthly"', () => {
      const { getByTestId } = renderBenefits('monthly');

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD('monthly')),
      ).toBeOnTheScreen();
      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });
  });

  // ── Plan-specific content ──────────────────────────────────────────────────

  describe('Plan-specific ATM fees content', () => {
    it('shows monthly subtitle and description for atm_fees when monthly plan is selected', () => {
      const { getByTestId, getByText, queryByText } = renderBenefits();

      // Default is annual — verify annual subtitle is shown
      expect(
        getByText(strings('pro_subscription.benefits.atm_fees.subtitle')),
      ).toBeOnTheScreen();

      // Switch to monthly plan
      fireEvent.press(getByTestId(BenefitsTestIds.PLAN_CARD('monthly')));

      // Subtitle should now be the monthly variant
      expect(
        getByText(
          strings('pro_subscription.benefits.atm_fees.subtitle_monthly'),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByText(strings('pro_subscription.benefits.atm_fees.subtitle')),
      ).not.toBeOnTheScreen();

      // Open ATM fees detail sheet — description should be monthly variant
      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('atm_fees')));
      expect(
        getByText(
          strings(
            'pro_subscription.benefits_description.atm_fees.description_monthly',
          ),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByText(
          strings('pro_subscription.benefits_description.atm_fees.description'),
        ),
      ).not.toBeOnTheScreen();
    });
  });

  // ── Pricing fetch states ───────────────────────────────────────────────────

  describe('Pricing fetch states', () => {
    it('shows a plan card skeleton per plan instead of plan cards while pricing is fetching', () => {
      mockPricingState({ isLoading: true });

      const { getAllByTestId, getByTestId, queryByTestId } = renderBenefits();

      expect(getByTestId(BenefitsTestIds.PRICING_LOADING)).toBeOnTheScreen();
      expect(getAllByTestId(BenefitsTestIds.PLAN_CARD_SKELETON)).toHaveLength(
        PLANS.length,
      );
      expect(queryByTestId(BenefitsTestIds.PLAN_CARD('annual'))).toBeNull();
      expect(queryByTestId(BenefitsTestIds.PRICING_ERROR)).toBeNull();
    });

    it('shows an error and retry control when pricing fetch fails', () => {
      mockPricingState({ hasError: true });

      const { getByTestId, queryByTestId } = renderBenefits();

      expect(getByTestId(BenefitsTestIds.PRICING_ERROR)).toBeOnTheScreen();
      expect(
        getByTestId(BenefitsTestIds.PRICING_RETRY_BUTTON),
      ).toBeOnTheScreen();
      expect(queryByTestId(BenefitsTestIds.PLAN_CARD('annual'))).toBeNull();
    });

    it('calls retry when the retry control is pressed', () => {
      mockPricingState({ hasError: true });

      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.PRICING_RETRY_BUTTON));

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('does not call onSuccess when the CTA is pressed while pricing is loading', () => {
      mockPricingState({ isLoading: true });

      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CTA_BUTTON));

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when the CTA is pressed after a pricing error', () => {
      mockPricingState({ hasError: true });

      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CTA_BUTTON));

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('hides the annual card when only monthly pricing is mapped', () => {
      mockPricingState({
        plusPricing: {
          status: 'ready',
          monthly: READY_PLUS_PRICING.monthly,
        },
      });

      const { getByTestId, queryByTestId } = renderBenefits();

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD('monthly')),
      ).toBeOnTheScreen();
      expect(queryByTestId(BenefitsTestIds.PLAN_CARD('annual'))).toBeNull();
      expect(
        queryByTestId(BenefitsTestIds.PLAN_CARD_SAVINGS_BADGE('annual')),
      ).toBeNull();
    });

    it('hides the savings badge when annual savings are undefined', () => {
      mockPricingState({
        plusPricing: {
          status: 'ready',
          monthly: READY_PLUS_PRICING.monthly,
          annual: READY_PLUS_PRICING.annual,
        },
      });

      const { queryByTestId } = renderBenefits();

      expect(
        queryByTestId(BenefitsTestIds.PLAN_CARD_SAVINGS_BADGE('annual')),
      ).toBeNull();
    });

    it('shows unavailable copy when Plus pricing is missing', () => {
      mockPricingState({ plusPricing: { status: 'unavailable' } });

      const { getByTestId, queryByTestId } = renderBenefits();

      expect(
        getByTestId(BenefitsTestIds.PRICING_UNAVAILABLE),
      ).toBeOnTheScreen();
      expect(queryByTestId(BenefitsTestIds.PLAN_CARD('annual'))).toBeNull();
    });

    it('shows malformed copy when Plus prices cannot be read', () => {
      mockPricingState({ plusPricing: { status: 'malformed' } });

      const { getByTestId, queryByTestId } = renderBenefits();

      expect(getByTestId(BenefitsTestIds.PRICING_MALFORMED)).toBeOnTheScreen();
      expect(queryByTestId(BenefitsTestIds.PLAN_CARD('annual'))).toBeNull();
    });

    it('does not call onSuccess when Plus pricing is unavailable', () => {
      mockPricingState({ plusPricing: { status: 'unavailable' } });

      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CTA_BUTTON));

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when Plus prices are malformed', () => {
      mockPricingState({ plusPricing: { status: 'malformed' } });

      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CTA_BUTTON));

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
