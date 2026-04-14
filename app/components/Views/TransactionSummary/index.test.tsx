import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TransactionSummary from './';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { TRANSACTION_TYPES } from '../../../util/transactions';

const renderWithTheme = (props: Record<string, unknown>) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <TransactionSummary {...props} />
    </ThemeContext.Provider>,
  );

describe('TransactionSummary', () => {
  const defaultProps = {
    amount: '0.5 ETH',
    fee: '0.001 ETH',
    totalAmount: '0.501 ETH',
    secondaryTotalAmount: '$1,000.00',
    gasEstimationReady: true,
    chainId: '0x1',
  };

  it('renders amount, fee, and total amount', () => {
    renderWithTheme(defaultProps);

    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('0.5 ETH')).toBeTruthy();
    expect(screen.getByText('0.001 ETH')).toBeTruthy();
    expect(screen.getByText('Total amount')).toBeTruthy();
    expect(screen.getByText('0.501 ETH')).toBeTruthy();
  });

  it('displays "Paid by MetaMask" tag instead of fee when gas is sponsored', () => {
    renderWithTheme({
      ...defaultProps,
      isGasFeeSponsored: true,
    });

    expect(screen.getByTestId('paid-by-metamask')).toBeTruthy();
    expect(screen.getByText('Paid by MetaMask')).toBeTruthy();
    expect(screen.queryByText('0.001 ETH')).toBeNull();
  });

  it('displays amount instead of totalAmount in total row when gas is sponsored', () => {
    renderWithTheme({
      ...defaultProps,
      isGasFeeSponsored: true,
    });

    const totalRow = screen.getByText('Total amount');
    expect(totalRow).toBeTruthy();
    // The total row should show the amount (0.5 ETH), not totalAmount (0.501 ETH)
    expect(screen.queryByText('0.501 ETH')).toBeNull();
    // Amount appears twice: once in the Amount row, once in the Total amount row
    expect(screen.getAllByText('0.5 ETH')).toHaveLength(2);
  });

  it('hides secondary total amount row when gas is sponsored', () => {
    renderWithTheme({
      ...defaultProps,
      isGasFeeSponsored: true,
    });

    expect(screen.queryByText('$1,000.00')).toBeNull();
  });

  it('shows secondary total amount row when gas is not sponsored', () => {
    renderWithTheme({
      ...defaultProps,
      isGasFeeSponsored: false,
    });

    expect(screen.getByText('$1,000.00')).toBeTruthy();
  });

  it('displays fee and totalAmount when gas is not sponsored', () => {
    renderWithTheme({
      ...defaultProps,
      isGasFeeSponsored: false,
    });

    expect(screen.getByText('0.001 ETH')).toBeTruthy();
    expect(screen.getByText('0.501 ETH')).toBeTruthy();
    expect(screen.queryByText('Paid by MetaMask')).toBeNull();
  });

  it('renders received transaction without fee row', () => {
    renderWithTheme({
      ...defaultProps,
      transactionType: TRANSACTION_TYPES.RECEIVED,
    });

    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.queryByText('Total amount')).toBeNull();
  });
});
