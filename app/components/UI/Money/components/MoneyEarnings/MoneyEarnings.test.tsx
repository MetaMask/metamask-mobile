import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyEarnings from './MoneyEarnings';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyEarnings', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyEarnings />);

    expect(getByText(strings('money.earnings.title'))).toBeOnTheScreen();
  });

  it('renders both default zero values when no props are provided', () => {
    const { getByTestId } = render(<MoneyEarnings />);

    expect(getByTestId(MoneyEarningsTestIds.LIFETIME_VALUE)).toHaveTextContent(
      '$0.00',
    );
    expect(getByTestId(MoneyEarningsTestIds.PROJECTED_VALUE)).toHaveTextContent(
      '$0.00',
    );
  });

  it('renders the provided lifetime and projected earnings values', () => {
    const { getByTestId } = render(
      <MoneyEarnings lifetimeEarnings="$12.34" projectedEarnings="$56.78" />,
    );

    expect(getByTestId(MoneyEarningsTestIds.LIFETIME_VALUE)).toHaveTextContent(
      '$12.34',
    );
    expect(getByTestId(MoneyEarningsTestIds.PROJECTED_VALUE)).toHaveTextContent(
      '$56.78',
    );
  });

  it('renders skeletons instead of values when loading', () => {
    const { getByTestId, queryByTestId } = render(<MoneyEarnings isLoading />);

    expect(
      getByTestId(MoneyEarningsTestIds.LIFETIME_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsTestIds.PROJECTED_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.LIFETIME_VALUE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.PROJECTED_VALUE),
    ).not.toBeOnTheScreen();
  });

  it('renders the navigation chevron on the projected column', () => {
    const { getByTestId } = render(<MoneyEarnings />);

    expect(
      getByTestId(MoneyEarningsTestIds.PROJECTED_CHEVRON),
    ).toBeOnTheScreen();
  });

  it('calls onProjectedPress when the projected column is tapped', () => {
    const mockPress = jest.fn();
    const { getByTestId } = render(
      <MoneyEarnings onProjectedPress={mockPress} />,
    );

    fireEvent.press(getByTestId(MoneyEarningsTestIds.PROJECTED));

    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the projected column is tapped without a handler', () => {
    const { getByTestId } = render(<MoneyEarnings />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyEarningsTestIds.PROJECTED));
    }).not.toThrow();
  });
});
