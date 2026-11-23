import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Logger from '../../../../../util/Logger';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import MoneyEarningsFooter from './MoneyEarningsFooter';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const mockNavigateToMoneyDeposit = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks/useMoneyDepositNavigation', () => ({
  useMoneyDepositNavigation: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseMoneyDepositNavigation = jest.mocked(useMoneyDepositNavigation);
const mockLoggerError = jest.mocked(Logger.error);

describe('MoneyEarningsFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyDepositNavigation.mockReturnValue({
      navigateToMoneyDeposit: mockNavigateToMoneyDeposit,
    });
  });

  it('calls deposit navigation from the Earn more action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON));

    expect(mockNavigateToMoneyDeposit).toHaveBeenCalledTimes(1);
  });

  it('logs when deposit navigation rejects', async () => {
    const error = new Error('Deposit navigation failed');
    mockNavigateToMoneyDeposit.mockRejectedValueOnce(error);
    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON));

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        '[MoneyEarningsFooter] Failed to navigate to deposit',
      );
    });
  });
});
