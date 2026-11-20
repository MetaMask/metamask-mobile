import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyAccountWithdrawal } from '../../hooks/useMoneyAccount';
import { useMoneyDepositNavigation } from '../../hooks/useMoneyDepositNavigation';
import MoneyEarningsFooter from './MoneyEarningsFooter';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const mockInitiateWithdrawal = jest.fn();
const mockNavigateToMoneyDeposit = jest.fn();

const getOnPress = (
  button: ReactTestInstance,
): (() => void | Promise<void>) => {
  let current: ReactTestInstance | null = button;

  while (current) {
    const { onPress } = current.props as {
      onPress?: () => void | Promise<void>;
    };
    if (typeof onPress === 'function') {
      return onPress;
    }
    current = current.parent;
  }

  throw new Error('onPress handler not found');
};

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } => ({ top: 48, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountWithdrawal: jest.fn(),
}));

jest.mock('../../hooks/useMoneyDepositNavigation', () => ({
  useMoneyDepositNavigation: jest.fn(),
}));

const mockUseMoneyAccountWithdrawal = jest.mocked(useMoneyAccountWithdrawal);
const mockUseMoneyDepositNavigation = jest.mocked(useMoneyDepositNavigation);

describe('MoneyEarningsFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountWithdrawal.mockReturnValue({
      initiateWithdrawal: mockInitiateWithdrawal,
    } as unknown as ReturnType<typeof useMoneyAccountWithdrawal>);
    mockUseMoneyDepositNavigation.mockReturnValue({
      navigateToMoneyDeposit: mockNavigateToMoneyDeposit,
    });
  });

  it('starts withdrawal from the Withdraw action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.WITHDRAW_BUTTON));

    expect(mockInitiateWithdrawal).toHaveBeenCalledTimes(1);
  });

  it('propagates withdrawal errors', async () => {
    const withdrawalError = new Error('Withdrawal failed');
    mockInitiateWithdrawal.mockRejectedValueOnce(withdrawalError);

    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);
    const withdrawButton = getByTestId(
      MoneyEarningsViewTestIds.WITHDRAW_BUTTON,
    );

    await expect(getOnPress(withdrawButton)()).rejects.toBe(withdrawalError);
  });

  it('opens deposit navigation from the Add action', () => {
    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON));

    expect(mockNavigateToMoneyDeposit).toHaveBeenCalledTimes(1);
  });

  it('propagates deposit navigation errors', async () => {
    const navigationError = new Error('Deposit navigation failed');
    mockNavigateToMoneyDeposit.mockRejectedValueOnce(navigationError);

    const { getByTestId } = renderWithProvider(<MoneyEarningsFooter />);
    const addButton = getByTestId(MoneyEarningsViewTestIds.ADD_BUTTON);

    await expect(getOnPress(addButton)()).rejects.toBe(navigationError);
  });
});
