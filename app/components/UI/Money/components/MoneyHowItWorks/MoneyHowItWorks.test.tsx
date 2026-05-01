import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyHowItWorks from './MoneyHowItWorks';
import { MoneyHowItWorksTestIds } from './MoneyHowItWorks.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyHowItWorks', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyHowItWorks apy={4} />);

    expect(getByText(strings('money.how_it_works.title'))).toBeOnTheScreen();
  });

  it('renders the description with prefix, APY, and suffix', () => {
    const { getByTestId } = render(<MoneyHowItWorks apy={4} />);

    const description = getByTestId(MoneyHowItWorksTestIds.DESCRIPTION);
    expect(description).toHaveTextContent(
      /Hold mUSD in your Money Account and auto-earn/,
    );
    expect(description).toHaveTextContent(
      /dollar-backed, always liquid, and ready to spend, trade, or send anytime\./,
    );
  });

  it('renders the highlighted APY value', () => {
    const { getByTestId } = render(<MoneyHowItWorks apy={4} />);

    expect(getByTestId(MoneyHowItWorksTestIds.APY)).toHaveTextContent(
      strings('money.apy_label', {
        percentage: 4,
      }),
    );
  });

  it('calls onHeaderPress when the section header is tapped', () => {
    const mockHeaderPress = jest.fn();
    const { getByText } = render(
      <MoneyHowItWorks apy={4} onHeaderPress={mockHeaderPress} />,
    );

    fireEvent.press(getByText(strings('money.how_it_works.title')));

    expect(mockHeaderPress).toHaveBeenCalledTimes(1);
  });

  it('hides the highlighted APY text when isLoading is true', () => {
    const { queryByTestId } = render(<MoneyHowItWorks apy={4} isLoading />);

    expect(queryByTestId(MoneyHowItWorksTestIds.APY)).not.toBeOnTheScreen();
  });

  it('shows the highlighted APY text when isLoading is false', () => {
    const { getByTestId } = render(<MoneyHowItWorks apy={4} />);

    expect(getByTestId(MoneyHowItWorksTestIds.APY)).toBeOnTheScreen();
  });

  it('hides the highlighted APY text when apy is undefined', () => {
    const { queryByTestId } = render(<MoneyHowItWorks apy={undefined} />);

    expect(queryByTestId(MoneyHowItWorksTestIds.APY)).not.toBeOnTheScreen();
  });

  it('hides the highlighted APY text when apy is zero', () => {
    const { queryByTestId } = render(<MoneyHowItWorks apy={0} />);

    expect(queryByTestId(MoneyHowItWorksTestIds.APY)).not.toBeOnTheScreen();
  });

  it('hides the highlighted APY text when apy is negative', () => {
    const { queryByTestId } = render(<MoneyHowItWorks apy={-1} />);

    expect(queryByTestId(MoneyHowItWorksTestIds.APY)).not.toBeOnTheScreen();
  });
});
