import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHowItWorks from './MoneyHowItWorks';
import { MoneyHowItWorksTestIds } from './MoneyHowItWorks.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';

describe('MoneyHowItWorks', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyHowItWorks />);

    expect(getByText(strings('money.how_it_works.title'))).toBeOnTheScreen();
  });

  it('renders the mUSD token row', () => {
    const { getByText } = render(<MoneyHowItWorks />);

    expect(getByText(MUSD_TOKEN.name)).toBeOnTheScreen();
    expect(getByText(MUSD_TOKEN.symbol)).toBeOnTheScreen();
  });

  it('renders the Add mUSD button', () => {
    const { getByTestId } = render(<MoneyHowItWorks />);

    expect(
      getByTestId(MoneyHowItWorksTestIds.ADD_MUSD_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onAddMusdPress when Add mUSD button is pressed', () => {
    const mockAddMusd = jest.fn();
    const { getByTestId } = render(
      <MoneyHowItWorks onAddMusdPress={mockAddMusd} />,
    );

    fireEvent.press(getByTestId(MoneyHowItWorksTestIds.ADD_MUSD_BUTTON));

    expect(mockAddMusd).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no callbacks are provided', () => {
    const { getByTestId } = render(<MoneyHowItWorks />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyHowItWorksTestIds.ADD_MUSD_BUTTON));
    }).not.toThrow();
  });
});
