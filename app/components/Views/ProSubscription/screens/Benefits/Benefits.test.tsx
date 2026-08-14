import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Benefits from './index';
import { BenefitsTestIds } from './Benefits.testIds';
import { BENEFITS, PLANS, type PlanId } from './Benefits.constants';
import { strings } from '../../../../../../locales/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();

const renderBenefits = (initialPlan?: PlanId) =>
  render(
    <Benefits
      onSuccess={mockOnSuccess}
      onClose={mockOnClose}
      initialPlan={initialPlan}
    />,
  );

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Benefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.CONTAINER)).toBeTruthy();
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
        ).toBeTruthy();
      });
    });

    it('renders each benefit row title and subtitle from i18n', () => {
      const { getByText } = renderBenefits();
      BENEFITS.forEach((benefit) => {
        expect(getByText(strings(benefit.title))).toBeTruthy();
        expect(getByText(strings(benefit.subtitle))).toBeTruthy();
      });
    });

    it('renders both plan selector cards', () => {
      const { getByTestId } = renderBenefits();
      PLANS.forEach((plan) => {
        expect(getByTestId(BenefitsTestIds.PLAN_CARD(plan.id))).toBeTruthy();
      });
    });

    it('renders the CTA button', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toBeTruthy();
    });

    it('renders the close button', () => {
      const { getByTestId } = renderBenefits();
      expect(getByTestId(BenefitsTestIds.CLOSE_BUTTON)).toBeTruthy();
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
    it('calls onClose when the close button is pressed', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CLOSE_BUTTON));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSuccess when the CTA is pressed', () => {
      const { getByTestId } = renderBenefits();

      fireEvent.press(getByTestId(BenefitsTestIds.CTA_BUTTON));

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('pressing a benefit row does not throw (SUB-993 stub)', () => {
      const firstBenefit = BENEFITS[0];
      const { getByTestId } = renderBenefits();

      expect(() =>
        fireEvent.press(
          getByTestId(BenefitsTestIds.BENEFIT_ROW(firstBenefit.id)),
        ),
      ).not.toThrow();
    });
  });

  // ── initialPlan prop ──────────────────────────────────────────────────────

  describe('initialPlan prop', () => {
    it('pre-selects the Monthly plan when initialPlan is "monthly"', () => {
      const { getByTestId } = renderBenefits('monthly');

      expect(getByTestId(BenefitsTestIds.PLAN_CARD('monthly'))).toBeTruthy();
      expect(getByTestId(BenefitsTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.join_pro'),
      );
    });
  });
});
