import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyWhatYouGet from './MoneyWhatYouGet';
import { MoneyWhatYouGetTestIds } from './MoneyWhatYouGet.testIds';
import { MoneySectionHeaderTestIds } from '../MoneySectionHeader/MoneySectionHeader.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyWhatYouGet', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyWhatYouGet />);

    expect(getByText(strings('money.what_you_get.title'))).toBeOnTheScreen();
  });

  it('does not render a chevron (section is not tappable)', () => {
    const { queryByTestId } = render(<MoneyWhatYouGet />);

    expect(
      queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
  });

  it('renders all six benefits', () => {
    const { getByTestId } = render(<MoneyWhatYouGet />);

    const container = getByTestId(MoneyWhatYouGetTestIds.CONTAINER);
    expect(container).toHaveTextContent(/Auto-earn/);
    expect(container).toHaveTextContent(/dollar-backed stablecoin/);
    expect(container).toHaveTextContent(/Get full liquidity/);
    expect(container).toHaveTextContent(/1-3% cashback/);
    expect(container).toHaveTextContent(
      /Transfer money to any of your wallets/,
    );
    expect(container).toHaveTextContent(/Send and receive money globally/);
  });

  it('renders the Learn more button', () => {
    const { getByTestId } = render(<MoneyWhatYouGet />);

    expect(
      getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onLearnMorePress when Learn more is tapped', () => {
    const mockLearnMore = jest.fn();
    const { getByTestId } = render(
      <MoneyWhatYouGet onLearnMorePress={mockLearnMore} />,
    );

    fireEvent.press(getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON));

    expect(mockLearnMore).toHaveBeenCalledTimes(1);
  });

  it('does not throw when Learn more is tapped without a handler', () => {
    const { getByTestId } = render(<MoneyWhatYouGet />);

    expect(() => {
      fireEvent.press(getByTestId(MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON));
    }).not.toThrow();
  });
});
