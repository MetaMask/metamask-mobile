import React from 'react';
import { type ViewStyle } from 'react-native';
import { render, fireEvent, renderHook } from '@testing-library/react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import PlanSelectorCard from './PlanSelectorCard';
import { BenefitsTestIds } from '../Benefits.testIds';
import type { PlanOption } from '../Benefits.constants';
import type { PlanSelectorCardCopy } from '../utils/getMoneyAccountPlusPricingCopy';
import { strings } from '../../../../../../../locales/i18n';
import { ThemeContext } from '../../../../../../util/theme';
import { AppThemeKey } from '../../../../../../util/theme/models';

const ANNUAL_PLAN: PlanOption = {
  id: 'annual',
  label: 'pro_subscription.plans.annual.label',
  price: 'pro_subscription.plans.annual.price',
  ctaLabel: 'pro_subscription.plans.annual.cta',
};

const MONTHLY_PLAN: PlanOption = {
  id: 'monthly',
  label: 'pro_subscription.plans.monthly.label',
  price: 'pro_subscription.plans.monthly.price',
  ctaLabel: 'pro_subscription.plans.monthly.cta',
};

const PRICE_COPY: PlanSelectorCardCopy = { price: '$49.99/year' };

const darkThemeContext = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

const renderCard = ({
  plan = ANNUAL_PLAN,
  copy = PRICE_COPY,
  isSelected = false,
  isDark = false,
  onPress = jest.fn(),
}: {
  plan?: PlanOption;
  copy?: PlanSelectorCardCopy;
  isSelected?: boolean;
  isDark?: boolean;
  onPress?: (planId: PlanOption['id']) => void;
} = {}) => {
  const card = (
    <PlanSelectorCard
      plan={plan}
      copy={copy}
      isSelected={isSelected}
      onPress={onPress}
    />
  );

  const view = render(
    isDark ? (
      <ThemeContext.Provider value={darkThemeContext}>
        {card}
      </ThemeContext.Provider>
    ) : (
      card
    ),
  );

  return { ...view, onPress };
};

/** Token colors resolved by the preset, so assertions stay theme-agnostic. */
const useIndicatorColors = () => {
  const { result } = renderHook(() => useTailwind());
  const tw = result.current;
  return {
    white: (tw.style('bg-white') as ViewStyle).backgroundColor,
    black: (tw.style('bg-black') as ViewStyle).backgroundColor,
    muted: (tw.style('bg-background-muted') as ViewStyle).backgroundColor,
  };
};

describe('PlanSelectorCard', () => {
  it('renders the plan label and price', () => {
    const { getByText, getByTestId } = renderCard();

    expect(
      getByText(strings('pro_subscription.plans.annual.label')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BenefitsTestIds.PLAN_CARD_PRICE('annual')),
    ).toHaveTextContent('$49.99/year');
  });

  it('renders the savings badge and sub price from copy', () => {
    const { getByTestId } = renderCard({
      copy: {
        price: '$49.99/year',
        subPrice: '$4.17/month',
        savingsBadge: 'Save 16%',
      },
    });

    expect(
      getByTestId(BenefitsTestIds.PLAN_CARD_SAVINGS_BADGE('annual')),
    ).toHaveTextContent('Save 16%');
    expect(
      getByTestId(BenefitsTestIds.PLAN_CARD_SUB_PRICE('annual')),
    ).toHaveTextContent('$4.17/month');
  });

  it('renders the trial label on the monthly plan', () => {
    const { getByTestId } = renderCard({
      plan: MONTHLY_PLAN,
      copy: {
        price: '$4.99/month',
        trialLabel: '7 day free trial',
      },
    });

    expect(
      getByTestId(BenefitsTestIds.PLAN_CARD_TRIAL('monthly')),
    ).toHaveTextContent('7 day free trial');
  });

  it('renders a trial banner on the annual plan', () => {
    const { getByTestId } = renderCard({
      copy: {
        price: '$49.99/year',
        trialLabel: '7 day free trial',
      },
    });

    expect(
      getByTestId(BenefitsTestIds.PLAN_CARD_TRIAL('annual')),
    ).toHaveTextContent('7 day free trial');
  });

  it('omits the savings badge, sub price, and trial label when copy has none', () => {
    const { queryByTestId } = renderCard();

    expect(
      queryByTestId(BenefitsTestIds.PLAN_CARD_SAVINGS_BADGE('annual')),
    ).toBeNull();
    expect(
      queryByTestId(BenefitsTestIds.PLAN_CARD_SUB_PRICE('annual')),
    ).toBeNull();
    expect(queryByTestId(BenefitsTestIds.PLAN_CARD_TRIAL('annual'))).toBeNull();
  });

  it('reports its selection state for assistive tech', () => {
    const { getByTestId } = renderCard({ isSelected: true });

    expect(getByTestId(BenefitsTestIds.PLAN_CARD('annual'))).toBeChecked();
  });

  it('reports an unselected state for assistive tech', () => {
    const { getByTestId } = renderCard();

    expect(getByTestId(BenefitsTestIds.PLAN_CARD('annual'))).not.toBeChecked();
  });

  it('calls onPress with the plan id', () => {
    const { getByTestId, onPress } = renderCard();

    fireEvent.press(getByTestId(BenefitsTestIds.PLAN_CARD('annual')));

    expect(onPress).toHaveBeenCalledWith('annual');
  });

  describe('selected radio indicator', () => {
    it('fills with black in the light theme', () => {
      const { black } = useIndicatorColors();

      const { getByTestId } = renderCard({ isSelected: true });

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_RADIO('annual')),
      ).toHaveStyle({ backgroundColor: black });
    });

    it('fills with white in the dark theme', () => {
      const { white } = useIndicatorColors();

      const { getByTestId } = renderCard({ isSelected: true, isDark: true });

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_RADIO('annual')),
      ).toHaveStyle({ backgroundColor: white });
    });
  });

  describe('annual trial banner', () => {
    it('fills with muted background when the annual plan is unselected', () => {
      const { muted } = useIndicatorColors();

      const { getByTestId } = renderCard({
        copy: {
          price: '$49.99/year',
          trialLabel: '7 day free trial',
        },
      });

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_TRIAL('annual')),
      ).toHaveStyle({ backgroundColor: muted });
    });

    it('fills with black when the annual plan is selected in the light theme', () => {
      const { black } = useIndicatorColors();

      const { getByTestId } = renderCard({
        isSelected: true,
        copy: {
          price: '$49.99/year',
          trialLabel: '7 day free trial',
        },
      });

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_TRIAL('annual')),
      ).toHaveStyle({ backgroundColor: black });
    });

    it('fills with white when the annual plan is selected in the dark theme', () => {
      const { white } = useIndicatorColors();

      const { getByTestId } = renderCard({
        isSelected: true,
        isDark: true,
        copy: {
          price: '$49.99/year',
          trialLabel: '7 day free trial',
        },
      });

      expect(
        getByTestId(BenefitsTestIds.PLAN_CARD_TRIAL('annual')),
      ).toHaveStyle({ backgroundColor: white });
    });
  });
});
