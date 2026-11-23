import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import MoneyEarningsFooter from './MoneyEarningsFooter';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const mockNavigateToMoneyDeposit = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } => ({ top: 48, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useMoneyDepositNavigation', () => ({
  useMoneyDepositNavigation: jest.fn(),
}));

const mockUseMoneyDepositNavigation = jest.mocked(useMoneyDepositNavigation);

describe('MoneyEarningsFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyDepositNavigation.mockReturnValue({
      navigateToMoneyDeposit: mockNavigateToMoneyDeposit,
    });
  });

  it('renders the Earn more action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);

    expect(getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON)).toHaveTextContent(
      strings('money.earnings.earn_more'),
    );
  });

  it('opens deposit navigation from the Earn more action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON));

    expect(mockNavigateToMoneyDeposit).toHaveBeenCalledTimes(1);
  });
});
