import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyPotentialEarnings from './MoneyPotentialEarnings';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyPotentialEarnings', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyPotentialEarnings />);

    expect(
      getByText(strings('money.potential_earnings.title')),
    ).toBeOnTheScreen();
  });

  it('renders the potential earnings amount', () => {
    const { getByTestId } = render(<MoneyPotentialEarnings />);

    expect(getByTestId(MoneyPotentialEarningsTestIds.AMOUNT)).toBeOnTheScreen();
  });

  it('renders all hardcoded token rows', () => {
    const { getByText } = render(<MoneyPotentialEarnings />);

    expect(getByText('USD Coin')).toBeOnTheScreen();
    expect(getByText('Tether')).toBeOnTheScreen();
    expect(getByText('Dai')).toBeOnTheScreen();
    expect(getByText('Ethereum')).toBeOnTheScreen();
    expect(getByText('Solana')).toBeOnTheScreen();
  });

  it('renders the See potential earnings CTA button', () => {
    const { getByTestId } = render(<MoneyPotentialEarnings />);

    expect(
      getByTestId(MoneyPotentialEarningsTestIds.SEE_EARNINGS_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onSeeEarningsPress when CTA button is pressed', () => {
    const mockSeeEarnings = jest.fn();
    const { getByTestId } = render(
      <MoneyPotentialEarnings onSeeEarningsPress={mockSeeEarnings} />,
    );

    fireEvent.press(
      getByTestId(MoneyPotentialEarningsTestIds.SEE_EARNINGS_BUTTON),
    );

    expect(mockSeeEarnings).toHaveBeenCalledTimes(1);
  });

  it('calls onTokenAddPress with token name when Add button is pressed', () => {
    const mockTokenAdd = jest.fn();
    const { getAllByText } = render(
      <MoneyPotentialEarnings onTokenAddPress={mockTokenAdd} />,
    );

    const addButtons = getAllByText(strings('money.potential_earnings.add'));
    fireEvent.press(addButtons[0]);

    expect(mockTokenAdd).toHaveBeenCalledWith('USD Coin');
  });
});
