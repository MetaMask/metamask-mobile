import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';

describe('QuickBuyBottomSheetSkeleton', () => {
  it('renders the loading container', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-content-loading')).toBeOnTheScreen();
  });

  it('renders the trade-mode toggle skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.getByTestId('quick-buy-skeleton-trade-mode'),
    ).toBeOnTheScreen();
  });

  it('renders the keypad placeholder', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-skeleton-keypad')).toBeOnTheScreen();
  });

  it('renders the pay-with pill skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-skeleton-pay-with')).toBeOnTheScreen();
  });

  it('renders the confirm-button skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.getByTestId('quick-buy-skeleton-confirm-button'),
    ).toBeOnTheScreen();
  });

  it('does not render the old USD preset buttons', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.queryByTestId('quick-buy-skeleton-preset-20'),
    ).not.toBeOnTheScreen();
  });

  it('renders the quick-amount pills skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.getByTestId('quick-buy-skeleton-quick-amounts'),
    ).toBeOnTheScreen();
  });

  it('does not render the removed slider placeholder', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.queryByTestId('quick-buy-skeleton-slider'),
    ).not.toBeOnTheScreen();
  });
});
