import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHowItWorks from './MoneyHowItWorks';
import { MoneyHowItWorksTestIds } from './MoneyHowItWorks.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyHowItWorks', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyHowItWorks />);

    expect(getByText(strings('money.how_it_works.title'))).toBeOnTheScreen();
  });

  it('renders the mUSD token row', () => {
    const { getByText } = render(<MoneyHowItWorks />);

    expect(
      getByText(strings('money.how_it_works.musd_name')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.how_it_works.musd_symbol')),
    ).toBeOnTheScreen();
  });

  it('renders the Get mUSD button', () => {
    const { getByTestId } = render(<MoneyHowItWorks />);

    expect(
      getByTestId(MoneyHowItWorksTestIds.GET_MUSD_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onGetMusdPress when Get mUSD button is pressed', () => {
    const mockGetMusd = jest.fn();
    const { getByTestId } = render(
      <MoneyHowItWorks onGetMusdPress={mockGetMusd} />,
    );

    fireEvent.press(getByTestId(MoneyHowItWorksTestIds.GET_MUSD_BUTTON));

    expect(mockGetMusd).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no callbacks are provided', () => {
    const { getByTestId } = render(<MoneyHowItWorks />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyHowItWorksTestIds.GET_MUSD_BUTTON));
    }).not.toThrow();
  });
});
