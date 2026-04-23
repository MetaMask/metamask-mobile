import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyOnboardingCard from './MoneyOnboardingCard';
import { MoneyOnboardingCardTestIds } from './MoneyOnboardingCard.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyOnboardingCard', () => {
  it('renders the step label with default step values', () => {
    const { getByTestId } = render(<MoneyOnboardingCard />);

    expect(
      getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
    ).toHaveTextContent(
      strings('money.onboarding.step_progress', { current: 1, total: 2 }),
    );
  });

  it('renders the step label with custom step values', () => {
    const { getByTestId } = render(
      <MoneyOnboardingCard currentStep={2} totalSteps={3} />,
    );

    expect(
      getByTestId(MoneyOnboardingCardTestIds.STEP_LABEL),
    ).toHaveTextContent(
      strings('money.onboarding.step_progress', { current: 2, total: 3 }),
    );
  });

  it('renders the coin illustration slot', () => {
    const { getByTestId } = render(<MoneyOnboardingCard />);

    expect(
      getByTestId(MoneyOnboardingCardTestIds.COIN_ILLUSTRATION),
    ).toBeOnTheScreen();
  });

  it('renders the title and description copy', () => {
    const { getByTestId } = render(<MoneyOnboardingCard />);

    expect(getByTestId(MoneyOnboardingCardTestIds.TITLE)).toHaveTextContent(
      strings('money.onboarding.title'),
    );
    expect(
      getByTestId(MoneyOnboardingCardTestIds.DESCRIPTION),
    ).toHaveTextContent(strings('money.onboarding.description'));
  });

  it('calls onCtaPress when CTA is tapped', () => {
    const mockCta = jest.fn();
    const { getByTestId } = render(
      <MoneyOnboardingCard onCtaPress={mockCta} />,
    );

    fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));

    expect(mockCta).toHaveBeenCalledTimes(1);
  });

  it('falls back to onAddPress when onCtaPress is not provided', () => {
    const mockAdd = jest.fn();
    const { getByTestId } = render(
      <MoneyOnboardingCard onAddPress={mockAdd} />,
    );

    fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('does not throw when CTA is tapped without a handler', () => {
    const { getByTestId } = render(<MoneyOnboardingCard />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON));
    }).not.toThrow();
  });

  it('renders step 2 title when currentStep is 2', () => {
    const { getByTestId } = render(<MoneyOnboardingCard currentStep={2} />);

    expect(getByTestId(MoneyOnboardingCardTestIds.TITLE)).toHaveTextContent(
      strings('money.onboarding.step2_title'),
    );
  });

  it('renders step 2 description when currentStep is 2', () => {
    const { getByTestId } = render(<MoneyOnboardingCard currentStep={2} />);

    expect(
      getByTestId(MoneyOnboardingCardTestIds.DESCRIPTION),
    ).toHaveTextContent(strings('money.onboarding.step2_description'));
  });

  it('renders step 2 CTA label when currentStep is 2', () => {
    const { getByTestId } = render(<MoneyOnboardingCard currentStep={2} />);

    expect(
      getByTestId(MoneyOnboardingCardTestIds.CTA_BUTTON),
    ).toHaveTextContent(strings('money.onboarding.step2_cta'));
  });
});
