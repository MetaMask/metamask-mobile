import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BenefitsFullPageModal from './index';
import { BenefitsFullPageModalTestIds } from './BenefitsFullPageModal.testIds';
import {
  BENEFITS,
  PLANS,
  type PlanId,
} from './BenefitsFullPageModal.constants';
import Routes from '../../../../constants/navigation/Routes';
import { useProSubscriptionEnabled } from '../../../../hooks/useProSubscriptionEnabled';
import { strings } from '../../../../../locales/i18n';

// ─── Navigation mocks ────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

/**
 * Configurable route params — mutate this object in individual tests to exercise
 * different `initialPlan` / `source` combinations without re-declaring the mock.
 */
let mockRouteParams: { initialPlan?: PlanId; source?: string } = {};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

// ─── Feature-flag mock ────────────────────────────────────────────────────────

jest.mock('../../../../hooks/useProSubscriptionEnabled');
const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);

// ─── Native module / third-party mocks ───────────────────────────────────────

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({
      children,
      style,
      testID,
    }: {
      children: React.ReactNode;
      style?: object;
      testID?: string;
    }) => (
      <View style={style} testID={testID}>
        {children}
      </View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderModal = () => render(<BenefitsFullPageModal />);

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('BenefitsFullPageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the modal container', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId(BenefitsFullPageModalTestIds.CONTAINER)).toBeTruthy();
    });

    it('renders the title', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId(BenefitsFullPageModalTestIds.TITLE)).toHaveTextContent(
        strings('pro_subscription.title'),
      );
    });

    it('renders the price line from i18n', () => {
      const { getByTestId } = renderModal();
      expect(
        getByTestId(BenefitsFullPageModalTestIds.PRICE_LINE),
      ).toHaveTextContent(strings('pro_subscription.description'));
    });

    it('renders all six benefit rows', () => {
      const { getByTestId } = renderModal();
      expect(BENEFITS).toHaveLength(6);
      BENEFITS.forEach((benefit) => {
        expect(
          getByTestId(BenefitsFullPageModalTestIds.BENEFIT_ROW(benefit.id)),
        ).toBeTruthy();
      });
    });

    it('renders each benefit row title and subtitle from i18n', () => {
      const { getByText } = renderModal();
      BENEFITS.forEach((benefit) => {
        expect(getByText(strings(benefit.title))).toBeTruthy();
        expect(getByText(strings(benefit.subtitle))).toBeTruthy();
      });
    });

    it('renders both plan selector cards', () => {
      const { getByTestId } = renderModal();
      PLANS.forEach((plan) => {
        expect(
          getByTestId(BenefitsFullPageModalTestIds.PLAN_CARD(plan.id)),
        ).toBeTruthy();
      });
    });

    it('renders the CTA button', () => {
      const { getByTestId } = renderModal();
      expect(getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON)).toBeTruthy();
    });

    it('renders the close button', () => {
      const { getByTestId } = renderModal();
      expect(
        getByTestId(BenefitsFullPageModalTestIds.CLOSE_BUTTON),
      ).toBeTruthy();
    });
  });

  // ── Plan selection ─────────────────────────────────────────────────────────

  describe('Plan selection', () => {
    it('renders CTA button with join label by default', () => {
      const { getByTestId } = renderModal();
      expect(
        getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON),
      ).toHaveTextContent(strings('pro_subscription.join_pro'));
    });

    it('CTA button shows join label when Annual plan is selected', () => {
      const { getByTestId } = renderModal();

      fireEvent.press(
        getByTestId(BenefitsFullPageModalTestIds.PLAN_CARD('annual')),
      );

      expect(
        getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON),
      ).toHaveTextContent(strings('pro_subscription.join_pro'));
    });

    it('CTA button shows join label when Monthly plan is tapped', () => {
      const { getByTestId } = renderModal();

      fireEvent.press(
        getByTestId(BenefitsFullPageModalTestIds.PLAN_CARD('monthly')),
      );

      expect(
        getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON),
      ).toHaveTextContent(strings('pro_subscription.join_pro'));
    });

    it('CTA button shows join label after switching back to Annual', () => {
      const { getByTestId } = renderModal();

      fireEvent.press(
        getByTestId(BenefitsFullPageModalTestIds.PLAN_CARD('monthly')),
      );
      fireEvent.press(
        getByTestId(BenefitsFullPageModalTestIds.PLAN_CARD('annual')),
      );

      expect(
        getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON),
      ).toHaveTextContent(strings('pro_subscription.join_pro'));
    });
  });

  // ── Navigation callbacks ───────────────────────────────────────────────────

  describe('Navigation', () => {
    it('calls goBack when the close button is pressed', () => {
      const { getByTestId } = renderModal();

      fireEvent.press(getByTestId(BenefitsFullPageModalTestIds.CLOSE_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls navigate to the success route when the CTA is pressed', () => {
      const { getByTestId } = renderModal();

      fireEvent.press(getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PRO_SUBSCRIPTION.SUCCESS,
      );
    });

    it('calls navigate to the benefit detail route when a benefit row is pressed', () => {
      const firstBenefit = BENEFITS[0];
      const { getByTestId } = renderModal();

      fireEvent.press(
        getByTestId(BenefitsFullPageModalTestIds.BENEFIT_ROW(firstBenefit.id)),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PRO_SUBSCRIPTION.BENEFIT_DETAIL_SHEET,
        { benefitId: firstBenefit.id },
      );
    });

    it('fires the correct benefit id when each row is pressed', () => {
      const { getByTestId } = renderModal();

      BENEFITS.forEach((benefit) => {
        mockNavigate.mockClear();
        fireEvent.press(
          getByTestId(BenefitsFullPageModalTestIds.BENEFIT_ROW(benefit.id)),
        );
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PRO_SUBSCRIPTION.BENEFIT_DETAIL_SHEET,
          { benefitId: benefit.id },
        );
      });
    });
  });

  // ── Feature-flag gating ───────────────────────────────────────────────────

  describe('Feature-flag gating', () => {
    it('calls goBack immediately when the Pro feature flag is disabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: false,
        variantName: 'control',
        isActive: false,
      });

      renderModal();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does NOT call goBack when the Pro feature flag is enabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: true,
        variantName: 'treatment',
        isActive: true,
      });

      renderModal();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Route param: initialPlan ──────────────────────────────────────────────

  describe('initialPlan route param', () => {
    it('pre-selects the Monthly plan when initialPlan param is "monthly"', () => {
      mockRouteParams = { initialPlan: 'monthly' };

      const { getByTestId } = renderModal();

      expect(
        getByTestId(BenefitsFullPageModalTestIds.PLAN_CARD('monthly')),
      ).toBeTruthy();
      expect(
        getByTestId(BenefitsFullPageModalTestIds.CTA_BUTTON),
      ).toHaveTextContent(strings('pro_subscription.join_pro'));
    });
  });
});
