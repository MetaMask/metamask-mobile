import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyWhyMetaMaskMoney from './MoneyWhyMetaMaskMoney';
import { MoneyWhyMetaMaskMoneyTestIds } from './MoneyWhyMetaMaskMoney.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyWhyMetaMaskMoney', () => {
  it('renders the section title', () => {
    const { getByText } = render(<MoneyWhyMetaMaskMoney />);

    expect(
      getByText(strings('money.why_metamask_money.title')),
    ).toBeOnTheScreen();
  });

  it('renders benefit rows', () => {
    const { getByText } = render(<MoneyWhyMetaMaskMoney />);

    expect(
      getByText(strings('money.why_metamask_money.benefit_dollar_backed')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.why_metamask_money.benefit_liquidity')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.why_metamask_money.benefit_global')),
    ).toBeOnTheScreen();
  });

  it('renders the Learn more button', () => {
    const { getByTestId } = render(<MoneyWhyMetaMaskMoney />);

    expect(
      getByTestId(MoneyWhyMetaMaskMoneyTestIds.LEARN_MORE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onLearnMorePress when Learn more button is pressed', () => {
    const mockLearnMore = jest.fn();
    const { getByTestId } = render(
      <MoneyWhyMetaMaskMoney onLearnMorePress={mockLearnMore} />,
    );

    fireEvent.press(
      getByTestId(MoneyWhyMetaMaskMoneyTestIds.LEARN_MORE_BUTTON),
    );

    expect(mockLearnMore).toHaveBeenCalledTimes(1);
  });
});
