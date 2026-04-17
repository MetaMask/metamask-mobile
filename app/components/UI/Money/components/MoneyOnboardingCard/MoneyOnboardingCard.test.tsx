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

  it('calls onAddPress when Add is tapped', () => {
    const mockAdd = jest.fn();
    const { getByTestId } = render(
      <MoneyOnboardingCard onAddPress={mockAdd} />,
    );

    fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.ADD_BUTTON));

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('does not throw when Add is tapped without a handler', () => {
    const { getByTestId } = render(<MoneyOnboardingCard />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyOnboardingCardTestIds.ADD_BUTTON));
    }).not.toThrow();
  });
});
