import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';

describe('QuickBuyBottomSheetSkeleton', () => {
  it('renders the loading container', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-content-loading')).toBeOnTheScreen();
  });

  it('renders the toolbar rate-tag skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-skeleton-rate-tag')).toBeOnTheScreen();
  });

  it('renders the slider skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-skeleton-slider')).toBeOnTheScreen();
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

  it('renders the quick-amount pills skeleton for both variants', () => {
    render(<QuickBuyBottomSheetSkeleton useKeyboard />);
    expect(
      screen.getByTestId('quick-buy-skeleton-quick-amounts'),
    ).toBeOnTheScreen();
  });

  it('does not render the keypad placeholder on the treatment (keypad closed by default)', () => {
    render(<QuickBuyBottomSheetSkeleton useKeyboard />);
    expect(
      screen.queryByTestId('quick-buy-skeleton-keypad'),
    ).not.toBeOnTheScreen();
  });

  it('hides the slider placeholder on the treatment', () => {
    render(<QuickBuyBottomSheetSkeleton useKeyboard />);
    expect(
      screen.queryByTestId('quick-buy-skeleton-slider'),
    ).not.toBeOnTheScreen();
  });

  it('renders the quick-amount pills skeleton on the control variant', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.getByTestId('quick-buy-skeleton-quick-amounts'),
    ).toBeOnTheScreen();
  });
});
