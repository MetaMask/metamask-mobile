import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHowItWorks from './MoneyHowItWorks';
import { MoneyHowItWorksTestIds } from './MoneyHowItWorks.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';

describe('MoneyHowItWorks', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyHowItWorks />);

    expect(getByText(strings('money.how_it_works.title'))).toBeOnTheScreen();
  });

  it('renders the description with prefix, APY, and suffix', () => {
    const { getByTestId } = render(<MoneyHowItWorks />);

    const description = getByTestId(MoneyHowItWorksTestIds.DESCRIPTION);
    expect(description).toHaveTextContent(
      /Hold mUSD in your Money Account and auto-earn/,
    );
    expect(description).toHaveTextContent(
      /dollar-backed, always liquid, and ready to spend, trade, or send anytime\./,
    );
  });

  it('renders the highlighted APY value', () => {
    const { getByTestId } = render(<MoneyHowItWorks />);

    expect(getByTestId(MoneyHowItWorksTestIds.APY)).toHaveTextContent(
      strings('money.apy_label', {
        percentage: String(MUSD_CONVERSION_APY),
      }),
    );
  });

  it('calls onHeaderPress when the section header is tapped', () => {
    const mockHeaderPress = jest.fn();
    const { getByText } = render(
      <MoneyHowItWorks onHeaderPress={mockHeaderPress} />,
    );

    fireEvent.press(getByText(strings('money.how_it_works.title')));

    expect(mockHeaderPress).toHaveBeenCalledTimes(1);
  });
});
