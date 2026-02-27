import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { RateRow } from './rate-row';

describe('RateRow', () => {
  it('renders loading skeleton when isLoading is true', () => {
    renderWithProvider(<RateRow tokenSymbol="USDC" isLoading />, { state: {} });

    expect(screen.getByTestId('rate-row-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('rate-row-container')).not.toBeOnTheScreen();
  });

  it('renders rate row container when isLoading is false', () => {
    renderWithProvider(<RateRow tokenSymbol="USDC" isLoading={false} />, {
      state: {},
    });

    expect(screen.getByTestId('rate-row-container')).toBeOnTheScreen();
    expect(screen.queryByTestId('rate-row-skeleton')).not.toBeOnTheScreen();
  });

  it('renders exchange rate text with the provided token symbol', () => {
    renderWithProvider(<RateRow tokenSymbol="DAI" isLoading={false} />, {
      state: {},
    });

    expect(screen.getByText('1 DAI = 1 mUSD')).toBeOnTheScreen();
  });
});
