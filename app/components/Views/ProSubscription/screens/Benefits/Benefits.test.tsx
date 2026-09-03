import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import Benefits from './Benefits';
import { BenefitsTestIds } from './Benefits.testIds';
import {
  BENEFITS,
  BENEFIT_DETAILS,
  PLANS,
  type PlanId,
} from './Benefits.constants';
import { strings } from '../../../../../../locales/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSuccess = jest.fn();

const renderBenefits = (initialPlan?: PlanId) =>
  render(<Benefits onSuccess={mockOnSuccess} initialPlan={initialPlan} />);

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Benefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('renders the price line from i18n', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.PRICE_LINE)).toHaveTextContent(
        strings('pro_subscription.description'),
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

    it('renders both plan selector cards', () => {
      const { getByTestId } = renderBenefits();
      PLANS.forEach((plan) => {
        expect(
          getByTestId(BenefitsTestIds.PLAN_CARD(plan.id)),
        ).toBeOnTheScreen();
      });
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

      expect(getByText(strings(apyDetail.description))).toBeOnTheScreen();
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

    it('shows subDescription, learnMore, and notes for the protection benefit', () => {
      const protectionDetail = BENEFIT_DETAILS.find(
        (d) => d.id === 'protection',
      );
      if (!protectionDetail)
        throw new Error('protection detail not found in BENEFIT_DETAILS');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('protection')));

      if (!protectionDetail.subDescription)
        throw new Error('protection.subDescription missing');
      if (!protectionDetail.learnMore)
        throw new Error('protection.learnMore missing');
      if (!protectionDetail.notes) throw new Error('protection.notes missing');
      expect(
        getByText(strings(protectionDetail.subDescription)),
      ).toBeOnTheScreen();
      expect(getByText(strings(protectionDetail.learnMore))).toBeOnTheScreen();
      expect(getByText(strings(protectionDetail.notes))).toBeOnTheScreen();
    });

    it('opens the learn more URL when the link is pressed', () => {
      const protectionDetail = BENEFIT_DETAILS.find(
        (d) => d.id === 'protection',
      );
      if (!protectionDetail)
        throw new Error('protection detail not found in BENEFIT_DETAILS');
      if (!protectionDetail.learnMore || !protectionDetail.learnMoreUrl)
        throw new Error('protection.learnMore or learnMoreUrl missing');
      const { getByTestId, getByText } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('protection')));
      fireEvent.press(getByText(strings(protectionDetail.learnMore)));

      expect(Linking.openURL).toHaveBeenCalledWith(
        protectionDetail.learnMoreUrl,
      );
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
      expect(getByText(strings(apyDetail.description))).toBeOnTheScreen();

      fireEvent(
        getByTestId(BenefitsTestIds.BENEFIT_DETAILS_CONTAINER),
        'close',
      );

      fireEvent.press(getByTestId(BenefitsTestIds.BENEFIT_ROW('support')));
      expect(getByText(strings(supportDetail.description))).toBeOnTheScreen();
      expect(queryByText(strings(apyDetail.description))).not.toBeOnTheScreen();
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
});
